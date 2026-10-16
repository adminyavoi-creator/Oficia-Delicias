import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const outputDir = new URL('../dist/', import.meta.url);
const directory = join(outputDir.pathname);
const publicFiles = [];

async function collect(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const absolute = join(folder, entry.name);
    if (entry.isDirectory()) await collect(absolute);
    else {
      const path = `/${relative(directory, absolute).split(sep).join('/')}`;
      if (path !== '/sw.js' && !path.endsWith('.mp4') && !path.endsWith('.map')) publicFiles.push(path);
    }
  }
}

await collect(directory);
const files = [...new Set(['/', ...publicFiles])].sort();
const revisionHash = createHash('sha256');
for (const path of files) {
  const relativePath = path === '/' ? 'index.html' : path.slice(1);
  revisionHash.update(path).update(await readFile(join(directory, relativePath)));
}
const revision = revisionHash.digest('hex').slice(0, 12);
await writeFile(join(directory, 'build-info.json'), JSON.stringify({ frontendRevision: revision }) + '\\n');
files.push('/build-info.json');
const swPath = join(directory, 'sw.js');
const sw = await readFile(swPath, 'utf8');
await writeFile(swPath, sw.replace('/* Vite replaces this placeholder with the generated production asset list. */', `/* Generated for Oficia build ${revision}. */`).replace('self.__OFICIA_PRECACHE__ || [\'/\']', JSON.stringify(files)).replace('__OFICIA_REVISION__', revision));
console.log(`PWA cache precargada con ${files.length} recursos (video excluido).`);
