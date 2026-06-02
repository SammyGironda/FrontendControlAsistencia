import client from './client';

const API_PREFIX = '/api/v1';

export const getRoles = async () => {
  const response = await client.get(`${API_PREFIX}/roles/`);
  return response.data;
};

export const getUsuariosCountByRol = async (rolId) => {
  const response = await client.get(`${API_PREFIX}/roles/${rolId}/usuarios/count`);
  return response.data.cantidad_usuarios;
};

export const crearRol = async (data) => {
  const response = await client.post(`${API_PREFIX}/roles/`, data);
  return response.data;
};

export const actualizarRol = async (id, data) => {
  const response = await client.put(`${API_PREFIX}/roles/${id}`, data);
  return response.data;
};

export const eliminarRol = async (id) => {
  const response = await client.delete(`${API_PREFIX}/roles/${id}`);
  return response.data;
};

export const toggleEstadoRol = async (id) => {
  const response = await client.patch(`${API_PREFIX}/roles/${id}/toggle-activo`);
  return response.data;
};
