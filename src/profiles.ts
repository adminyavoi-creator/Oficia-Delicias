export type AccountType = 'cliente' | 'anfitrion';

export function isAccountType(value: unknown): value is AccountType {
  return value === 'cliente' || value === 'anfitrion';
}

export async function ensureAccountType(
  find: () => Promise<unknown | null>,
  create: (type: AccountType) => Promise<unknown>,
  requested: AccountType | null,
): Promise<AccountType | null> {
  const existing = await find();
  if (isAccountType(existing)) return existing;
  if (!requested) return null;
  try {
    const created = await create(requested);
    if (!isAccountType(created)) throw new Error('Supabase no devolvió un tipo de perfil válido.');
    return created;
  } catch (creationError) {
    // A competing auth event may have inserted the unique row first; keep its immutable role.
    const raced = await find();
    if (isAccountType(raced)) return raced;
    throw creationError;
  }
}
