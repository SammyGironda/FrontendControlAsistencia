import client from './client';

const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';

export const login = async (username, password) => {
  if (BYPASS_AUTH) {
    return {
      token: 'temp-dev-token',
      usuario_id: 1,
      username,
      rol_id: 1,
    };
  }

  const response = await client.post('/api/v1/usuarios/verify-credentials', null,{
    params: {
      username,
      password,
    },
  });

  const { usuario_id, username: backendUsername, rol_id } = response.data;

  return {
    token: response.data.token ?? response.data.access_token ?? null,
    usuario_id,
    username: backendUsername,
    rol_id,
  };
};
