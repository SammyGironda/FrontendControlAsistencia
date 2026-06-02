import client from './client';

const API_PREFIX = '/api/v1';

export const getFeriados = async (params = {}) => {
  const response = await client.get(`${API_PREFIX}/feriados/`, { params });
  return response.data;
};

export const getFeriadosAplicables = async (dia, mes, codigo_departamento) => {
  const response = await client.get(
    `${API_PREFIX}/feriados/aplicables/${dia}/${mes}/${codigo_departamento}`
  );
  return response.data;
};

export const crearFeriado = async (data) => {
  const response = await client.post(`${API_PREFIX}/feriados/`, data);
  return response.data;
};

export const actualizarFeriado = async (id, data) => {
  const response = await client.put(`${API_PREFIX}/feriados/${id}`, data);
  return response.data;
};

export const desactivarFeriado = async (id) => {
  const response = await client.delete(`${API_PREFIX}/feriados/${id}`);
  return response.data;
};

export const eliminarFeriadoPermanente = async (id) => {
  const response = await client.delete(`${API_PREFIX}/feriados/${id}/permanente`);
  return response.data;
};
