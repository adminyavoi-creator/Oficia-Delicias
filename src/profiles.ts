export type AccountType = 'cliente' | 'anfitrion';

export function isAccountType(value: unknown): value is AccountType {
  return value === 'cliente' || value === 'anfitrion';
}
