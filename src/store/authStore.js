import { create } from 'zustand';

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

// Contenedor de estado "puro": no conoce el modo bypass. La decisión de
// cómo se obtiene el primer token (login manual, o auto-login de bypass en
// App.jsx) vive fuera de este archivo — ver App.jsx y api/auth.js.
const useAuthStore = create((set) => ({
  token: localStorage.getItem('access_token') || null,
  user: getStoredUser(),
  isAuthenticated: !!localStorage.getItem('access_token'),

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
