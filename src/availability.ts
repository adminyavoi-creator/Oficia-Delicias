import type { Space, Unit } from './data';

export type BusyInterval = { startsAt: string; endsAt: string };

function atNoonUtc(date: string) { return new Date(`${date}T12:00:00Z`); }
function deliciasInstant(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let instant = target;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chihuahua', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const values = Object.fromEntries(parts.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
    instant += target - represented;
  }
  return instant;
}
function dateAfter(date: string, days: number) {
  const next = atNoonUtc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
function minutes(time: string) { return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)); }

// El servidor vuelve a validar: una renta autorizada puede ocupar el espacio
// después de que se abra esta pantalla.
export function slotAvailability(space: Space, date: string, time: string, unit: Unit, quantity: number, closedDates: ReadonlySet<string>, now = new Date(), busyIntervals: readonly BusyInterval[] = []): string | null {
  if (deliciasInstant(date, time) <= now.getTime()) return 'Elige un horario futuro';
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
  const start = deliciasInstant(date, time);
  const duration = unit === 'Hora' ? quantity * 60 : unit === 'Día' ? quantity * 24 * 60 : quantity * 7 * 24 * 60;
  const end = start + duration * 60_000;
  if (busyIntervals.some(interval => start < Date.parse(interval.endsAt) && end > Date.parse(interval.startsAt))) {
    return 'Ese horario ya está reservado';
  }
  return null;
}
