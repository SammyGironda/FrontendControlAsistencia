import client from './client';

// Subir Excel con marcaciones
export const subirExcel = async (file, params = {}) => {
  const formData = new FormData();
  formData.append('file', file); // verifica el nombre del campo en el router
  const response = await client.post(
    '/api/v1/marcaciones/upload-excel',
    formData,
    { params, headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

// Crear marcación manual
export const crearMarcacion = async (data) => {
  const response = await client.post('/api/v1/marcaciones/', data);
  return response.data;
};

// Marcaciones de un empleado
export const getMarcacionesEmpleado = async (empleadoId, params) => {
  const response = await client.get(
    `/api/v1/marcaciones/empleado/${empleadoId}`,
    { params }
  );
  return response.data;
};

// Marcaciones huérfanas
export const getMarcacionesHuerfanas = async () => {
  const response = await client.get('/api/v1/marcaciones/huerfanas');
  return response.data;
};

// Marcaciones duplicadas
export const getMarcacionesDuplicadas = async () => {
  const response = await client.get('/api/v1/marcaciones/duplicadas');
  return response.data;
};

// Historial de archivos Excel
export const getArchivos = async (params = {}) => {
  const response = await client.get('/api/v1/marcaciones/archivos', { params });
  return response.data;
};

// Detalle de un archivo
export const getArchivo = async (archivoId) => {
  const response = await client.get(
    `/api/v1/marcaciones/archivos/${archivoId}`
  );
  return response.data;
};

// Actualizar estado de archivo
export const actualizarArchivo = async (archivoId, data) => {
  const response = await client.put(
    `/api/v1/marcaciones/archivos/${archivoId}`,
    data
  );
  return response.data;
};

// Incidencias pendientes
export const getIncidenciasPendientes = async () => {
  const response = await client.get(
    '/api/v1/marcaciones/incidencias/pendientes'
  );
  return response.data;
};

// Resolver incidencia
export const resolverIncidencia = async (incidenciaId, data) => {
  const response = await client.put(
    `/api/v1/marcaciones/incidencias/${incidenciaId}`,
    data
  );
  return response.data;
};
