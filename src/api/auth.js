import client from './client';

const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';

const MOCK_USUARIO = {
  id: 1,
  username: 'dev-user',
  id_rol: 1,
  nombre_rol: 'Admin (bypass)',
  id_empleado: null,
};

// Login real contra POST /api/v1/auth/login (JWT). Devuelve siempre
// { token, usuario } — tanto en modo bypass como en modo real — para que
// quien llame (Login.jsx) no tenga que ramificar según BYPASS_AUTH.
export const login = async (username, password) => {
  if (BYPASS_AUTH) {
    return {
      token: 'temp-dev-token',
      usuario: { ...MOCK_USUARIO, username },
    };
  }

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
