export interface SavedAccount {
  email: string;
  name: string;
  avatarUrl: string;
  provider: 'credentials' | 'google';
}

const STORAGE_KEY = 'sp-saved-accounts';

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedAccount[];
  } catch {
    return [];
  }
}

export function upsertSavedAccount(account: SavedAccount) {
  try {
    const accounts = getSavedAccounts();
    const idx = accounts.findIndex((a) => a.email === account.email);
    if (idx >= 0) {
      accounts[idx] = { ...accounts[idx], ...account };
    } else {
      accounts.unshift(account);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, 5)));
  } catch {}
}

export function removeSavedAccount(email: string) {
  try {
    const accounts = getSavedAccounts().filter((a) => a.email !== email);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {}
}
