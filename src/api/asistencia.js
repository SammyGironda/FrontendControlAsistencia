import client from './client';

// Asistencias de un empleado
export const getAsistenciaEmpleado = async (idEmpleado, params) => {
  const response = await client.get(
    `/api/v1/asistencia/empleado/${idEmpleado}`,
    { params }
  );
  return response.data;
};

// Detalle de un registro
export const getAsistencia = async (asistenciaId) => {
  const response = await client.get(
    `/api/v1/asistencia/${asistenciaId}`
  );
  return response.data;
};

// Actualizar registro
export const actualizarAsistencia = async (asistenciaId, data) => {
  const response = await client.put(
    `/api/v1/asistencia/${asistenciaId}`,
    data
  );
  return response.data;
};

// Eliminar registro
export const eliminarAsistencia = async (asistenciaId) => {
  const response = await client.delete(
    `/api/v1/asistencia/${asistenciaId}`
  );
  return response.data;
};

// Crear registro manual
export const crearAsistencia = async (data) => {
  const response = await client.post('/api/v1/asistencia/', data);
  return response.data;
};

// Procesar asistencia de un día
export const procesarDia = async (data) => {
  const response = await client.post(
    '/api/v1/asistencia/procesar-dia',
    data
  );
  return response.data;
};

// Recalcular asistencia de un empleado
export const recalcularAsistencia = async (idEmpleado, data) => {
  const response = await client.post(
    `/api/v1/asistencia/recalcular/${idEmpleado}`,
    data
  );
  return response.data;
};

export const getResumenMensual = async (idEmpleado, anio, mes) => {
  const response = await client.get(`/api/v1/asistencia/resumen-mensual/${idEmpleado}/${anio}/${mes}`);
  return response.data;
};
