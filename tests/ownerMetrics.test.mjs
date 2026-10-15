import assert from 'node:assert/strict';
import test from 'node:test';
import { ownerRevenue } from '../src/ownerMetrics.ts';

test('los ingresos solo cuentan rentas reales autorizadas y depósitos verificados', () => {
  const spaces = [{ id: 'real-a', is_demo: false }, { id: 'real-b', is_demo: false }, { id: 'demo', is_demo: true }];
  const bookings = [
    { space_id: 'real-a', status: 'confirmada', payment_status: 'verificado', total_cents: 12500 },
    { space_id: 'real-a', status: 'confirmada', payment_status: 'verificado', total_cents: 7500 },
    { space_id: 'real-b', status: 'pendiente', payment_status: 'reportado', total_cents: 99000 },
    { space_id: 'demo', status: 'confirmada', payment_status: 'verificado', total_cents: 100000 },
    { space_id: 'ajeno', status: 'confirmada', payment_status: 'verificado', total_cents: 100000 },
  ];
  const result = ownerRevenue(bookings, spaces);
  assert.equal(result.grossCents, 20000);
  assert.equal(result.bySpaceCents.get('real-a'), 20000);
  assert.equal(result.bySpaceCents.has('demo'), false);
  assert.equal(result.confirmed.length, 2);
});
