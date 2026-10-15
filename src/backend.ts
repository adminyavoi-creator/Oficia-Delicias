import { AsyncStorage } from './storage';
import { createClient } from '@supabase/supabase-js';
import { Booking, Space, TransferStatus, Unit, spaces } from './data';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const backendConfigured = Boolean(supabaseUrl && publishableKey);

const isServer = typeof window === 'undefined';
const webSafeStorage = {
  getItem: (key: string) => isServer ? Promise.resolve(null) : AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => isServer ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) => isServer ? Promise.resolve() : AsyncStorage.removeItem(key),
};

export const supabase = backendConfigured
  ? createClient(supabaseUrl, publishableKey, {
      auth: { storage: webSafeStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: !isServer, flowType: 'pkce' },
    })
  : null;

export type SpaceRow = {
  id: string; name: string; area: string; category: Space['category']; capacity: number;
  description: string; privacy: string; amenities: string[]; image_url: string; gallery_urls: string[];
  rate_hour_cents: number; rate_day_cents: number; rate_week_cents: number; rating: number | null;
  review_count: number; is_demo: boolean; is_published: boolean; latitude?: number | null; longitude?: number | null;
};

export function mapSpace(row: SpaceRow): Space {
  const demoPoint = row.is_demo ? spaces.find(space => space.id === row.id) : undefined;
  return {
    id: row.id, name: row.name, area: row.area, category: row.category, capacity: row.capacity,
    description: row.description, privacy: row.privacy, amenities: row.amenities ?? [],
    image: row.image_url, gallery: row.gallery_urls?.length ? row.gallery_urls : [row.image_url],
    rate: { Hora: row.rate_hour_cents / 100, Día: row.rate_day_cents / 100, Semana: row.rate_week_cents / 100 },
    rating: row.rating == null ? 'Nuevo' : Number(row.rating).toFixed(1), reviewCount: row.review_count ?? 0,
    isDemo: row.is_demo, latitude: row.latitude ?? demoPoint?.latitude, longitude: row.longitude ?? demoPoint?.longitude,
  };
}

export type BookingRow = {
  id: string; space_id: string; local_date: string; local_time: string; unit: Unit; quantity: number;
  total_cents: number; status: 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada';
  transfer_reference?: string; payer_reference?: string | null; payment_status?: TransferStatus;
};

export function mapBooking(row: BookingRow): Booking {
  const shortId = row.id.replaceAll('-', '').slice(0, 6).toUpperCase();
  const status: Booking['status'] = row.status === 'confirmada' ? 'Confirmada' : row.status === 'rechazada' ? 'Rechazada' : 'Solicitud enviada';
  return {
    id: `OF-${shortId}`, remoteId: row.id, spaceId: row.space_id, date: row.local_date,
    time: row.local_time.slice(0, 5), unit: row.unit, quantity: row.quantity,
    total: row.total_cents / 100, status, transferReference: row.transfer_reference,
    payerReference: row.payer_reference, paymentStatus: row.payment_status,
  };
}

export const databaseStatus = (status: Booking['status']) => status === 'Confirmada' ? 'confirmada' : status === 'Rechazada' ? 'rechazada' : 'pendiente';
