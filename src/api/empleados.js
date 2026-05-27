import client from './client';

export const getEmpleados = async (params) => {
  const response = await client.get('/empleados/', { params });
  return response.data;
};

export const getEmpleado = async (id) => {
  const response = await client.get(`/empleados/${id}`);
  return response.data;
};

export const crearEmpleado = async (data) => {
  const response = await client.post('/empleados/', data);
  return response.data;
};

export const actualizarEmpleado = async (id, data) => {
  const response = await client.put(`/empleados/${id}`, data);
  return response.data;
};

export const eliminarEmpleado = async (id) => {
  const response = await client.delete(`/empleados/${id}`);
  return response.data;
};

export const getCargos = async () => {
  const { data } = await client.get('/cargos');
  return data;
};

export const getDepartamentos = async () => {
  const { data } = await client.get('/departamentos');
  return data;
};

export const getHorarios = async () => {
  const { data } = await client.get('/horarios');
  return data;
};

