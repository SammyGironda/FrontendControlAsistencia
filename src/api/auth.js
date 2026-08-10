import client from './client';

// Login real contra POST /api/v1/auth/login (JWT). Devuelve siempre
// { token, usuario } — tanto para el formulario de Login.jsx como para el
// auto-login de desarrollo (VITE_BYPASS_AUTH) que dispara App.jsx al arrancar.
export const login = async (username, password) => {
  const response = await client.post('/api/v1/auth/login', {
    username,
    password,
  });

  const { access_token, usuario } = response.data;

  return {
    token: access_token,
    usuario,
  };
};

// Valida el token actual contra el backend (GET /api/v1/auth/me) y devuelve
// el usuario asociado. Se usa al arrancar la app para confirmar que un token
// persistido en localStorage sigue siendo válido (no expiró, el usuario
// sigue activo). No atrapa errores: si el token es inválido/expiró, el
// interceptor de respuesta de client.js ya maneja el 401 (toast + logout +
// redirect); quien llama a getCurrentUser() puede además reaccionar por su
// cuenta si lo necesita.
export const getCurrentUser = async () => {
  const response = await client.get('/api/v1/auth/me');
  return response.data;
};
