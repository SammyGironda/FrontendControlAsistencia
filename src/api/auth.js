import client from './client';

export const login = async (username, password) => {
  const response = await client.post('/api/v1/usuarios/verify-credentials', null,{
    params: {
      username,
      password,
    },
  });
  return response.data;
};
