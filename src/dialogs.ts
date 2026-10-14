export async function confirmInBrowser(title: string, message: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  return window.confirm(`${title}\n\n${message}`);
}

export function showMessage(title: string, message: string): void {
  if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
}
