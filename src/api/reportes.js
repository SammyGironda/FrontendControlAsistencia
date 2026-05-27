import client from './client';

export const generarReporte = async (tipo, params) => {
  const response = await client.post(`/reportes/generar/${tipo}`, params, {
    responseType: 'blob', // Important for file downloads
  });
  return response.data;
};

export const getReportes = async () => {
  const response = await client.get('/reportes/');
  return response.data;
};
