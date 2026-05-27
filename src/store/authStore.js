import { create } from 'zustand';

// TEMPORAL: bypass de autenticación para desarrollo
const BYPASS_AUTH = true; // Cambiaremos a FALSE cuando el backend esté listo

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