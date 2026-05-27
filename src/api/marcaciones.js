import client from './client';

export const subirExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post('/marcaciones/upload-excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getIncidencias = async () => {
  const response = await client.get('/marcaciones/incidencias');
  return response.data;
};

export const resolverIncidencia = async (id, data) => {
  const response = await client.put(`/marcaciones/incidencias/${id}`, data);
  return response.data;
};
