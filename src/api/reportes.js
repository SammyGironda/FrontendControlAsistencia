import client from './client';

const API_PREFIX = '/api/v1';

export const generarPlanilla = async (data) => {
  const response = await client.post(`${API_PREFIX}/reportes/planilla`, data);
  return response.data;
};

export const generarAsistenciaMensual = async (data) => {
  const response = await client.post(`${API_PREFIX}/reportes/asistencia-mensual`, data);
  return response.data;
};

export const generarVacaciones = async (data) => {
  const response = await client.post(`${API_PREFIX}/reportes/vacaciones`, data);
  return response.data;
};

export const generarIndividual = async (idEmpleado, data = {}) => {
  const response = await client.post(`${API_PREFIX}/reportes/individual/${idEmpleado}`, data);
  return response.data;
};

export const listarReportes = async (params = {}) => {
  const response = await client.get(`${API_PREFIX}/reportes/`, { params });
  return response.data;
};

// Compatibilidad: antiguo nombre `getReportes`
export const getReportes = listarReportes;

export const obtenerReporte = async (id) => {
  const response = await client.get(`${API_PREFIX}/reportes/${id}`);
  return response.data;
};

export const descargarReporte = async (id) => {
  const response = await client.get(`${API_PREFIX}/reportes/${id}/descargar`, { responseType: 'blob' });
  return response.data;
};

export const eliminarReporte = async (id) => {
  const response = await client.delete(`${API_PREFIX}/reportes/${id}`);
  return response.data;
};

export const eliminarReportePermanente = async (id) => {
  const response = await client.delete(`${API_PREFIX}/reportes/${id}/permanente`);
  return response.data;
};
