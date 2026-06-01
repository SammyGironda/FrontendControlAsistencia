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

/**
 * Obtiene las incidencias de marcaciones.
 * @param {object} params - Objeto de parámetros de filtro.
 * @param {string} params.tipo - 'huerfana', 'duplicada', 'inconsistente'.
 * @param {string} params.estado_resolucion - 'pendiente', 'resuelta', 'ignorada'.
 * @param {string} params.busqueda - Término de búsqueda para nombre o CI de empleado.
 */
export const getIncidencias = async (params = {}) => {
  // TODO: El backend actualmente solo tiene /incidencias/pendientes.
  // Se necesita un endpoint más flexible como /incidencias que acepte query params.
  // const queryParams = new URLSearchParams(params);
  // const response = await client.get(`${API_PREFIX}/marcaciones/incidencias?${queryParams}`);
  
  // Implementación temporal hasta que el backend se actualice
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

export const getArchivosExcel = async (params = {}) => {
  const response = await client.get(`${API_PREFIX}/marcaciones/archivos`, {
    params,
  });
  return response.data;
};

/**
 * Resuelve una incidencia de marcación.
 * @param {number} id - ID de la incidencia.
 * @param {object} data - Datos de la resolución.
 * @param {string} data.estado_resolucion - 'resuelta' o 'ignorada'.
 * @param {string} [data.descripcion_resolucion] - Nota opcional.
 * @param {string} [data.evidencia_url] - URL del archivo de evidencia (si aplica).
 * @param {object} [data.detalle_resolucion] - Objeto con detalles específicos de la acción.
 */
export const resolverIncidencia = async (id, data) => {
  // El backend espera un schema IncidenciaMarcacionUpdate
  const payload = {
    estado_resolucion: data.estado_resolucion,
    descripcion_resolucion: data.descripcion_resolucion,
    // TODO: El backend no parece tener un campo para la acción específica o evidencia_url directamente.
    // Esto podría necesitar ir en un campo JSON o ser manejado de otra forma.
    // Por ahora, lo enviamos en la descripción.
  };
  const response = await client.put(`${API_PREFIX}/marcaciones/incidencias/${id}`, payload);
  return response.data;
};

/**
 * Sube un archivo de evidencia para una incidencia.
 * TODO: El backend necesita un endpoint para manejar la subida de archivos de evidencia.
 * @param {File} file - El archivo a subir.
 * @returns {Promise<{url: string}>} - La URL del archivo subido.
 */
export const subirEvidencia = async (file) => {
  console.warn("La función subirEvidencia no está implementada en el backend.");
  const formData = new FormData();
  formData.append('file', file);
  
  // return client.post(`${API_PREFIX}/archivos/upload-evidencia`, formData, {
  //   headers: { 'Content-Type': 'multipart/form-data' },
  // });

  // Mock response
  return Promise.resolve({ url: `https://example.com/uploads/${file.name}` });
};
