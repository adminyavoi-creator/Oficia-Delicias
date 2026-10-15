import assert from 'node:assert/strict';
import test from 'node:test';
import { myBookings } from '../src/visibility.ts';

const bookings = [
  { id: 'client', clientId: 'client-a' },
  { id: 'operator-view', clientId: 'client-b' },
  { id: 'old-local' },
];

test('Mis reservas muestra solo las solicitudes del titular autenticado', () => {
  assert.deepEqual(myBookings(bookings, 'client-a', true).map(item => item.id), ['client']);
  assert.deepEqual(myBookings(bookings, 'client-b', true).map(item => item.id), ['operator-view']);
  assert.deepEqual(myBookings(bookings, null, true), []);
});

test('El prototipo local conserva sus solicitudes locales', () => {
  assert.equal(myBookings(bookings, null, false).length, 3);
});
