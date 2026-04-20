const KEY = "authToken";

export function getAuthToken(): string | null {
  return localStorage.getItem(KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(KEY);
}
