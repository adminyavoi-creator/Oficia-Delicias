import type { User } from '@supabase/supabase-js';

function metadataText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function profileDisplayName(user: Pick<User, 'email' | 'user_metadata'> | null | undefined): string {
  const metadata = user?.user_metadata ?? {};
  const fullName = metadataText(metadata.full_name) ?? metadataText(metadata.name);
  if (fullName) return fullName;
  const givenName = metadataText(metadata.given_name);
  if (givenName) return givenName;
  return user?.email?.split('@')[0] || 'Tu cuenta';
}

export function profileAvatarUrl(user: Pick<User, 'user_metadata'> | null | undefined): string {
  const metadata = user?.user_metadata ?? {};
  return metadataText(metadata.avatar_url) ?? metadataText(metadata.picture) ?? '';
}
