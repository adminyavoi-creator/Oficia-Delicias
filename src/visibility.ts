import type { Booking } from './data';

/** La bandeja personal nunca debe reutilizar la vista ampliada de Operaciones. */
export function myBookings(bookings: Booking[], userId: string | null, connected: boolean): Booking[] {
  if (!connected) return bookings;
  if (!userId) return [];
  return bookings.filter(booking => booking.clientId === userId);
}
