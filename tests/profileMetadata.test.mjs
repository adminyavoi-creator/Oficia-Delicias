import assert from 'node:assert/strict';
import test from 'node:test';
import { profileAvatarUrl, profileDisplayName } from '../src/profileMetadata.ts';
import { ensureAccountType } from '../src/profiles.ts';

test('personaliza con el nombre y la foto recibidos de Google Auth', () => {
  const user = { email: 'ana@example.com', user_metadata: { full_name: 'Ana Pérez', avatar_url: 'https://img.example/ana.jpg' } };
  assert.equal(profileDisplayName(user), 'Ana Pérez');
  assert.equal(profileAvatarUrl(user), 'https://img.example/ana.jpg');
});

test('una elección posterior conserva el perfil fijo de la cuenta', async () => {
  let creates = 0;
  const role = await ensureAccountType(async () => 'cliente', async () => { creates += 1; return 'anfitrion'; }, 'anfitrion');
  assert.equal(role, 'cliente');
  assert.equal(creates, 0);
});

test('si dos inicios de sesión compiten, recupera el perfil creado primero', async () => {
  let stored = null;
  let lookedUp = 0;
  const role = await ensureAccountType(
    async () => { lookedUp += 1; return stored; },
    async () => { stored = 'cliente'; throw new Error('unique violation'); },
    'anfitrion',
  );
  assert.equal(role, 'cliente');
  assert.equal(lookedUp, 2);
});

test('una cuenta sin perfil entra al rol que eligió', async () => {
  const role = await ensureAccountType(async () => null, async desired => desired, 'anfitrion');
  assert.equal(role, 'anfitrion');
});

test('acepta las variantes de metadatos de Google y usa el correo como respaldo', () => {
  assert.equal(profileDisplayName({ email: 'luis@example.com', user_metadata: { name: 'Luis Ríos' } }), 'Luis Ríos');
  assert.equal(profileAvatarUrl({ user_metadata: { picture: 'https://img.example/luis.jpg' } }), 'https://img.example/luis.jpg');
  assert.equal(profileDisplayName({ email: 'luis@example.com', user_metadata: {} }), 'luis');
  assert.equal(profileAvatarUrl({ user_metadata: {} }), '');
});
