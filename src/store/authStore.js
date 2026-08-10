import { create } from 'zustand';

// Solo habilitar de forma explícita para desarrollo local.
const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';

// Forma real del objeto `usuario` que devuelve el backend
// (POST /api/v1/auth/login y GET /api/v1/auth/me): id, username, id_rol,
// nombre_rol, id_empleado. El mock de bypass usa la misma forma para que
// Sidebar y el resto de consumidores de `user` no tengan que ramificar.
const MOCK_USER = {
  id: 1,
  username: 'dev-user',
  id_rol: 1,
  nombre_rol: 'Admin (bypass)',
  id_empleado: null,
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

const useAuthStore = create((set) => ({
  token: BYPASS_AUTH
    ? 'temp-dev-token'
    : (localStorage.getItem('access_token') || null),

  user: BYPASS_AUTH
    ? MOCK_USER
    : getStoredUser(),

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
