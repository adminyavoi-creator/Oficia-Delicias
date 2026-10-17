export type RevenueBooking = { space_id: string; status: string; total_cents: number };
export type RevenueSpace = { id: string; is_demo: boolean };

// Informative ticket estimate only. Keep amounts in integer MXN cents.
// Taxes on the space rental and host-specific withholdings are intentionally
// excluded until the transaction model and each host's tax profile are verified.
export const OFICIA_FEE_BASIS_POINTS = 1500;
export const ESTIMATED_FEE_VAT_BASIS_POINTS = 1600;

export function ownerStatement(baseCents: number) {
  const rentalBaseCents = Math.max(0, Math.round(baseCents));
  const platformFeeCents = Math.round(rentalBaseCents * OFICIA_FEE_BASIS_POINTS / 10_000);
  const estimatedFeeVatCents = Math.round(platformFeeCents * ESTIMATED_FEE_VAT_BASIS_POINTS / 10_000);
  return {
    rentalBaseCents,
    platformFeeCents,
    estimatedFeeVatCents,
    estimatedBeforeHostTaxesCents: rentalBaseCents - platformFeeCents - estimatedFeeVatCents,
  };
}

export function ownerTicketEstimates<T extends RevenueBooking>(bookings: T[], spaces: RevenueSpace[]) {
  const realIds = new Set(spaces.filter(space => !space.is_demo).map(space => space.id));
  const bySpaceCents = new Map<string, number>();
  // A visible ticket is created only after the host has accepted, Operations
  // has recorded the external collection, and the booking is authorized.
  const active = bookings.filter(booking => realIds.has(booking.space_id) && booking.status === 'confirmada');
  for (const booking of active) bySpaceCents.set(booking.space_id, (bySpaceCents.get(booking.space_id) ?? 0) + booking.total_cents);
  return { active, bySpaceCents, grossCents: [...bySpaceCents.values()].reduce((sum, cents) => sum + cents, 0) };
}
