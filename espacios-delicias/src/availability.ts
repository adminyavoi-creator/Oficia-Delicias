import type { Space, Unit } from './data';

function atNoonUtc(date: string) { return new Date(`${date}T12:00:00Z`); }
function dateAfter(date: string, days: number) {
  const next = atNoonUtc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
function minutes(time: string) { return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)); }

// El servidor vuelve a validar: una renta autorizada puede ocupar el espacio
// después de que se abra esta pantalla.
export function slotAvailability(space: Space, date: string, time: string, unit: Unit, quantity: number, closedDates: ReadonlySet<string>, now = new Date()): string | null {
  if (new Date(`${date}T${time}:00`).getTime() <= now.getTime()) return 'Elige un horario futuro';
  if (space.isDemo) return null;
  const day = atNoonUtc(date).getUTCDay();
  if (!(space.openDays ?? [1, 2, 3, 4, 5]).includes(day)) return 'Cerrado ese día';
  const opens = minutes(space.opensAt ?? '08:00');
  const closes = minutes(space.closesAt ?? '18:00');
  const arrival = minutes(time);
  if (arrival < opens || arrival >= closes) return 'Fuera del horario';
  if (unit === 'Hora' && arrival + quantity * 60 > closes) return 'Termina después del cierre';
  const days = unit === 'Hora' ? 1 : unit === 'Día' ? quantity + 1 : quantity * 7 + 1;
  for (let offset = 0; offset < days; offset++) {
    const current = dateAfter(date, offset);
    if (unit !== 'Hora' && offset === days - 1 && arrival === 0) break;
    if (closedDates.has(current)) return 'Cerrado durante la estancia';
  }
  return null;
}
