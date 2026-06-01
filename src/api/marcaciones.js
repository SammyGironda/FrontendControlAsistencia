import client from './client';

const API_PREFIX = '/api/v1';

export const subirExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post(`${API_PREFIX}/marcaciones/upload-excel`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getIncidencias = async () => {
  const response = await client.get(`${API_PREFIX}/marcaciones/incidencias/pendientes`);

  if (Array.isArray(response.data)) {
    return {
      items: response.data,
      total: response.data.length,
    };
  }

  if (response.data && Array.isArray(response.data.items)) {
    return {
      items: response.data.items,
      total: response.data.total ?? response.data.items.length,
    };
  }

  return {
    items: [],
    total: 0,
  };
};

export const resolverIncidencia = async (id, data) => {
  const response = await client.put(`${API_PREFIX}/marcaciones/incidencias/${id}`, data);
  return response.data;
};
