const TOKEN_KEY = 'tontine_pro_token';
const PHONE_KEY = 'tontine_pro_userPhone';
const USER_KEY = 'tontine_pro_user';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const saveAuthUser = (userData: { token: string; phone: string; user?: any }) => {
  localStorage.setItem(TOKEN_KEY, userData.token);
  localStorage.setItem(PHONE_KEY, userData.phone);
  if (userData.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(userData.user));
  }
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PHONE_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getSavedPhone = (): string | null => localStorage.getItem(PHONE_KEY);
export const getSavedUser = (): any | null => {
  const u = localStorage.getItem(USER_KEY);
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch (e) {
    return null;
  }
};

export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
    ...(token ? { 'Authorization': `Bearer ${token}`, 'user-id': token } : {}),
  };
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearAuth();
    // Instead of doing window.location.href = '/', which reloads and might lose local state, 
    // we can redirect or let the AuthContext hook state update to null.
    // Trigger window.location.reload() or let the front-end handle logout.
    window.location.href = '/';
    throw new Error('Session expirée');
  }
  return response;
};
