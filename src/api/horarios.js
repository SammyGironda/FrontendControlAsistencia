import client from './client';

const API_PREFIX = '/api/v1';

export const getHorarios = async (params = {}) => {
  const queryParams = {
    skip: typeof params.skip === 'number' ? params.skip : 0,
    limit: typeof params.limit === 'number' ? params.limit : 100,
  };

  if (typeof params.activo !== 'undefined') {
    queryParams.activo_only = Boolean(params.activo);
  }

  if (typeof params.activo_only !== 'undefined') {
    queryParams.activo_only = Boolean(params.activo_only);
  }

  const response = await client.get(`${API_PREFIX}/horarios/`, { params: queryParams });
  return response.data;
};

export const getAsignacionHorario = async (empleadoId) => {
  const response = await client.get(`${API_PREFIX}/horarios/asignaciones`, {
    params: {
      id_empleado: Number(empleadoId),
      activo_only: true,
    },
  });
  return response.data;
};

export const crearAsignacion = async (data) => {
  const response = await client.post(`${API_PREFIX}/horarios/asignaciones`, data);
  return response.data;
};

export const finalizarAsignacion = async (id, fechaFin) => {
  const response = await client.put(`${API_PREFIX}/horarios/asignaciones/${id}`, {
    fecha_fin: fechaFin,
    es_activo: false,
  });
  return response.data;
};
