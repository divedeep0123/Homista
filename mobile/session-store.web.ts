const SESSION_KEY = 'homista_access_token';

export async function readSessionToken(): Promise<string | null> {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(SESSION_KEY);
}

export async function writeSessionToken(token: string): Promise<void> {
  localStorage.setItem(SESSION_KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  localStorage.removeItem(SESSION_KEY);
}
