import { readdir, readFile } from 'node:fs/promises';

const distInfo = await readFile('dist/build-info.json');
const androidInfo = await readFile('android/app/src/main/assets/public/build-info.json');
if (!distInfo.equals(androidInfo)) {
  console.error('Android contiene recursos web distintos del build actual del PWA.');
  process.exit(1);
}

const info = JSON.parse(distInfo.toString('utf8'));
if (!/^[a-f0-9]{12}$/.test(info.frontendRevision)) {
  console.error('No se pudo verificar la revisión del frontend empaquetado.');
  process.exit(1);
}

const entries = await readdir('android/app/src/main/assets/public/assets', { withFileTypes: true });
let hasSupabaseProject = false;
for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
  const content = await readFile(`android/app/src/main/assets/public/assets/${entry.name}`, 'utf8');
  if (content.includes('vfvqmlsgqxiarmbquhco.supabase.co')) hasSupabaseProject = true;
}
if (!hasSupabaseProject) {
  console.error('Android quedó sin backend de Oficia; no se generará una app de demostración.');
  process.exit(1);
}

console.log(`Recursos Android verificados: frontend ${info.frontendRevision}, backend de Oficia configurado.`);
