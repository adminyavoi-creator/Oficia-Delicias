export type RevenueBooking = { space_id: string; status: string; payment_status: string; total_cents: number };
export type RevenueSpace = { id: string; is_demo: boolean };

export function ownerRevenue(bookings: RevenueBooking[], spaces: RevenueSpace[]) {
  const realIds = new Set(spaces.filter(space => !space.is_demo).map(space => space.id));
  const bySpaceCents = new Map<string, number>();
  const confirmed = bookings.filter(booking => realIds.has(booking.space_id) && booking.status === 'confirmada' && booking.payment_status === 'verificado');
  for (const booking of confirmed) bySpaceCents.set(booking.space_id, (bySpaceCents.get(booking.space_id) ?? 0) + booking.total_cents);
  return { confirmed, bySpaceCents, grossCents: [...bySpaceCents.values()].reduce((sum, cents) => sum + cents, 0) };
}
