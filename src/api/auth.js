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

// El propio usuario reemplaza su contraseña temporal. Opera siempre sobre la
// cuenta del token: no lleva id en la URL, así que no hay forma de apuntarlo a
// otra cuenta.
//
// Al confirmar, el backend baja `requiere_cambio_password`. Quien llame a esto
// debe refrescar el usuario del store (getCurrentUser) para que el guard de
// PrivateRoute deje de redirigir a la pantalla de cambio obligatorio.
//
// Errores esperables: 400 si la contraseña actual es incorrecta o si la nueva
// es igual a la actual, y 422 si la nueva no cumple la política (mínimo 8
// caracteres, con mayúscula, minúscula y dígito).
export const cambiarPasswordObligatorio = async (passwordActual, passwordNueva) => {
  const response = await client.post('/api/v1/auth/cambiar-password-obligatorio', {
    password_actual: passwordActual,
    password_nueva: passwordNueva,
  });
  return response.data;
};
