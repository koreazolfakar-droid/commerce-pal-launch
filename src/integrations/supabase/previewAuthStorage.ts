/** Storage accepted by Supabase's `auth.storage` option; browser storage and the in-memory fallback both satisfy it. */
export interface PreviewAuthStorage {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

const SPACE_CALL_SUPABASE_AUTH_KEY = 'sb-rtwyankpxtffqqrasyzw-auth-token';
type BrowserStorageKind = 'session' | 'local';

function createMemoryStorage(): PreviewAuthStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

function safeBrowserStorage(kind: BrowserStorageKind) {
  try {
    const storage = kind === 'session' ? window.sessionStorage : window.localStorage;
    const probe = '__space_call_auth_storage_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function useTabScopedProductionStorage(): PreviewAuthStorage {
  const tabStorage = safeBrowserStorage('session');
  const legacyStorage = safeBrowserStorage('local');
  const clearLegacy = () => {
    try { legacyStorage?.removeItem(SPACE_CALL_SUPABASE_AUTH_KEY); } catch { /* blocked storage */ }
  };
  if (!tabStorage) {
    clearLegacy();
    return createMemoryStorage();
  }
  try {
    const current = tabStorage.getItem(SPACE_CALL_SUPABASE_AUTH_KEY);
    const legacySession = legacyStorage?.getItem(SPACE_CALL_SUPABASE_AUTH_KEY) ?? null;
    if (!current && legacySession) tabStorage.setItem(SPACE_CALL_SUPABASE_AUTH_KEY, legacySession);
    clearLegacy();
    return tabStorage;
  } catch {
    clearLegacy();
    return createMemoryStorage();
  }
}

/** Tab-scoped authentication, including embedded pages. The export name is kept for callers. */
export function brokeredPreviewStorage(): PreviewAuthStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  return useTabScopedProductionStorage();
}
