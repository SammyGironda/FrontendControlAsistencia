import client from './client';

export const getAsistencia = async (params) => {
  const response = await client.get('/asistencia/', { params });
  return response.data;
};

export const getResumenEmpleado = async (id, mes, anio) => {
  const response = await client.get(`/asistencia/resumen/${id}/${mes}/${anio}`);
  return response.data;
};
