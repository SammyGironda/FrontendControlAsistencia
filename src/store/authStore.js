import { create } from 'zustand';

// Solo habilitar de forma explícita para desarrollo local.
const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';

const useAuthStore = create((set) => ({
  token: BYPASS_AUTH 
    ? 'temp-dev-token' 
    : (localStorage.getItem('access_token') || null),
  
  user: BYPASS_AUTH 
    ? { id: 1, username: 'dev-user', rol_id: 1 }
    : (JSON.parse(localStorage.getItem('user')) || null),
  
  isAuthenticated: BYPASS_AUTH ? true : !!localStorage.getItem('access_token'),

  setAuth: (token, user) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
