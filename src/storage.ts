const storage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(key, value); } catch { /* storage may be disabled by the browser */ }
    }
  },
  async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(key); } catch { /* storage may be disabled by the browser */ }
    }
  },
};

export const AsyncStorage = storage;
