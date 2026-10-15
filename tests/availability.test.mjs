import assert from 'node:assert/strict';
import test from 'node:test';
import { slotAvailability } from '../src/availability.ts';

const real = { isDemo: false, openDays: [1, 2, 3, 4, 5], opensAt: '08:00', closesAt: '18:00' };
const now = new Date('2026-10-15T00:00:00');

test('la reserva por horas respeta día y hora de cierre', () => {
  assert.equal(slotAvailability(real, '2026-10-19', '09:00', 'Hora', 2, new Set(), now), null);
  assert.equal(slotAvailability(real, '2026-10-18', '09:00', 'Hora', 1, new Set(), now), 'Cerrado ese día');
  assert.equal(slotAvailability(real, '2026-10-19', '17:00', 'Hora', 2, new Set(), now), 'Termina después del cierre');
});

test('un cierre dentro de varios días o semanas bloquea toda la estancia', () => {
  const closures = new Set(['2026-10-21']);
  assert.equal(slotAvailability(real, '2026-10-20', '09:00', 'Día', 1, closures, now), 'Cerrado durante la estancia');
  assert.equal(slotAvailability(real, '2026-10-19', '09:00', 'Semana', 1, closures, now), 'Cerrado durante la estancia');
  assert.equal(slotAvailability(real, '2026-10-19', '09:00', 'Hora', 1, closures, now), null);
});

test('las rentas autorizadas bloquean intervalos solapados sin revelar datos personales', () => {
  const occupied = [{ startsAt: '2026-10-19T15:00:00.000Z', endsAt: '2026-10-19T16:00:00.000Z' }];
  assert.equal(slotAvailability(real, '2026-10-19', '09:30', 'Hora', 1, new Set(), now, occupied), 'Ese horario ya está reservado');
  assert.equal(slotAvailability(real, '2026-10-19', '10:00', 'Hora', 1, new Set(), now, occupied), null);
});

test('las estancias largas también detectan una renta autorizada en un día posterior', () => {
  const occupied = [{ startsAt: '2026-10-20T17:00:00.000Z', endsAt: '2026-10-20T18:00:00.000Z' }];
  assert.equal(slotAvailability(real, '2026-10-19', '09:00', 'Día', 2, new Set(), now, occupied), 'Ese horario ya está reservado');
});
