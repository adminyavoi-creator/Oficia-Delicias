import assert from 'node:assert/strict';
import test from 'node:test';
import { ownerTicketEstimates, ownerStatement } from '../src/ownerMetrics.ts';

test('los tickets cuentan solicitudes activas de espacios reales sin requerir pago', () => {
  const spaces = [{ id: 'real-a', is_demo: false }, { id: 'real-b', is_demo: false }, { id: 'demo', is_demo: true }];
  const bookings = [
    { space_id: 'real-a', status: 'confirmada', payment_status: 'verificado', total_cents: 12500 },
    { space_id: 'real-a', status: 'confirmada', payment_status: 'verificado', total_cents: 7500 },
    { space_id: 'real-b', status: 'pendiente', payment_status: 'pendiente', total_cents: 99000 },
    { space_id: 'real-b', status: 'rechazada', payment_status: 'pendiente', total_cents: 50000 },
    { space_id: 'demo', status: 'confirmada', payment_status: 'verificado', total_cents: 100000 },
    { space_id: 'ajeno', status: 'confirmada', payment_status: 'verificado', total_cents: 100000 },
  ];
  const result = ownerTicketEstimates(bookings, spaces);
  assert.equal(result.grossCents, 119000);
  assert.equal(result.bySpaceCents.get('real-a'), 20000);
  assert.equal(result.bySpaceCents.has('demo'), false);
  assert.equal(result.active.length, 3);
});

test('desglosa la tarifa Oficia sobre renta base excluyendo impuestos de renta', () => {
  const result = ownerStatement(28_000); // $280.00
  assert.deepEqual(result, {
    rentalBaseCents: 28_000,
    platformFeeCents: 4_200,
    estimatedFeeVatCents: 672,
    estimatedBeforeHostTaxesCents: 23_128,
  });
});

test('redondea cada concepto en centavos y no devuelve saldos negativos', () => {
  assert.equal(ownerStatement(1).platformFeeCents, 0);
  assert.equal(ownerStatement(-100).rentalBaseCents, 0);
  assert.equal(ownerStatement(-100).estimatedBeforeHostTaxesCents, 0);
});
