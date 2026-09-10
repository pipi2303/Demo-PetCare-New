// Shared storage key + accessor for the server-issued session token, so any
// module (React context, plain utils, etc.) can attach it to API calls
// without needing to be inside a component tree.
export const SESSION_TOKEN_STORAGE_KEY = 'petcare_session_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    }
  } catch (e) {
    // Ignore storage errors
  }
}

export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
