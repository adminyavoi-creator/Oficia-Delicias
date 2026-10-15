export type Category = 'Todos' | 'Oficina privada' | 'Sala de juntas' | 'Coworking';
export type Unit = 'Hora' | 'Día' | 'Semana';
export type Tab = 'Inicio' | 'Explorar' | 'Favoritos' | 'Reservas' | 'Perfil';

export type Space = {
  id: string;
  name: string;
  area: string;
  category: Exclude<Category, 'Todos'>;
  capacity: number;
  rate: Record<Unit, number>;
  rating: string;
  reviewCount: number;
  image: string;
  gallery: string[];
  amenities: string[];
  description: string;
  privacy: string;
  isDemo: boolean;
  openDays?: number[];
  opensAt?: string;
  closesAt?: string;
  latitude?: number;
  longitude?: number;
  featured?: boolean;
};

export type TransferStatus = 'pendiente' | 'reportado' | 'verificado' | 'rechazado';

export type TransferSettings = {
  bankName: string;
  clabe: string;
  beneficiary: string;
  instructions: string;
};

export type Booking = {
  id: string;
  remoteId?: string;
  clientId?: string;
  spaceId: string;
  date: string;
  time: string;
  unit: Unit;
  quantity: number;
  total: number;
  status: 'Solicitud enviada' | 'Confirmada' | 'Rechazada';
  transferReference?: string;
  payerReference?: string | null;
  paymentStatus?: TransferStatus;
};

// Datos de demostración: sustituir por inventario, precios y fotos autorizados.
export const spaces: Space[] = [
  {
    id: 'sala-norte', name: 'Sala Norte', area: 'Centro, Delicias', category: 'Sala de juntas', capacity: 8,
    rate: { Hora: 280, Día: 1750, Semana: 7750 }, rating: '4.9', reviewCount: 38,
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1100&q=85',
    gallery: [
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1100&q=85',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1100&q=85',
      'https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=1100&q=85',
    ],
    amenities: ['Internet rápido', 'Pantalla', 'Pizarrón', 'Videollamadas', 'Café'],
    description: 'Un espacio privado y luminoso para reunir a tu equipo, presentar ideas y tomar decisiones con todo listo al llegar.',
    privacy: 'Sala cerrada y de uso exclusivo durante tu reserva.', isDemo: true, featured: true, latitude: 28.1930, longitude: -105.4715,
  },
  {
    id: 'oficina-olivo', name: 'Oficina Olivo', area: 'Sector Oriente, Delicias', category: 'Oficina privada', capacity: 4,
    rate: { Hora: 190, Día: 1190, Semana: 5350 }, rating: '4.8', reviewCount: 27,
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1100&q=85',
    gallery: [
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1100&q=85',
      'https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=1100&q=85',
    ],
    amenities: ['Internet rápido', 'Monitor', 'Café', 'Enchufes', 'Climatización'],
    description: 'Una oficina tranquila para trabajar con concentración, atender llamadas y mantener tu día bajo control.',
    privacy: 'Oficina independiente con puerta.', isDemo: true, latitude: 28.1801, longitude: -105.4830,
  },
  {
    id: 'mesa-colectiva', name: 'Mesa Colectiva', area: 'Centro, Delicias', category: 'Coworking', capacity: 1,
    rate: { Hora: 85, Día: 490, Semana: 2190 }, rating: '4.9', reviewCount: 46,
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1100&q=85',
    gallery: [
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1100&q=85',
      'https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=1100&q=85',
    ],
    amenities: ['Internet rápido', 'Café', 'Enchufes', 'Área común'],
    description: 'Un lugar flexible para cambiar de ambiente, avanzar en tus proyectos y coincidir con otras personas.',
    privacy: 'Área compartida; las llamadas se realizan en zonas designadas.', isDemo: true, latitude: 28.1990, longitude: -105.4590,
  },
  {
    id: 'estudio-alamo', name: 'Estudio Álamo', area: 'Meoqui, Chihuahua', category: 'Oficina privada', capacity: 3,
    rate: { Hora: 220, Día: 1390, Semana: 6200 }, rating: '4.7', reviewCount: 19,
    image: 'https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=1100&q=85',
    gallery: [
      'https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=1100&q=85',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1100&q=85',
    ],
    amenities: ['Internet rápido', 'Proyector', 'Pizarrón', 'Climatización'],
    description: 'Un estudio cómodo para sesiones de trabajo pequeñas, reuniones privadas o proyectos de varios días.',
    privacy: 'Espacio cerrado y de uso exclusivo durante tu reserva.', isDemo: true, latitude: 28.2771, longitude: -105.4810,
  },
];

export const categories: { label: Category; icon: 'grid' | 'briefcase' | 'users' | 'cowork' }[] = [
  { label: 'Todos', icon: 'grid' },
  { label: 'Oficina privada', icon: 'briefcase' },
  { label: 'Sala de juntas', icon: 'users' },
  { label: 'Coworking', icon: 'cowork' },
];

export const formatMoney = (value: number) => `$${value.toLocaleString('es-MX')} MXN`;
export const formatDate = (key: string) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${key}T12:00:00`));

export const isFutureSlot = (dateKey: string, time: string, now = new Date()) =>
  new Date(`${dateKey}T${time}:00`).getTime() > now.getTime();

export function estimatedEnd(dateKey: string, time: string, unit: Unit, quantity: number) {
  const end = new Date(`${dateKey}T${time}:00`);
  const hours = unit === 'Hora' ? quantity : unit === 'Día' ? quantity * 24 : quantity * 7 * 24;
  end.setHours(end.getHours() + hours);
  const day = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(end);
  const hour = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }).format(end);
  return `${day} · ${hour}`;
}

export const nextDates = (count = 7) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + index);
  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    day: new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(date).replace('.', '').toUpperCase(),
    number: date.getDate(),
    label: new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(date),
  };
});
