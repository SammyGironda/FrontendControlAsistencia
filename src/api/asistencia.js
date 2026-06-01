import client from './client';

const API_PREFIX = '/api/v1';

const buildAsistenciaParams = (params = {}) => {
  const queryParams = {};

  const idEmpleado = params.id_empleado ?? params.idEmpleado ?? params.empleadoId ?? params.id;
  if (idEmpleado != null && idEmpleado !== '') {
    queryParams.id_empleado = Number(idEmpleado);
  }

  if (params.mes && params.anio) {
    const mes = String(params.mes).padStart(2, '0');
    const anio = String(params.anio);
    queryParams.fecha_desde = `${anio}-${mes}-01`;
    queryParams.fecha_hasta = `${anio}-${mes}-${new Date(Number(anio), Number(mes), 0).getDate()}`;
  } else if (params.fecha_desde || params.fecha_hasta) {
    if (params.fecha_desde) queryParams.fecha_desde = params.fecha_desde;
    if (params.fecha_hasta) queryParams.fecha_hasta = params.fecha_hasta;
  } else if (params.fecha) {
    queryParams.fecha_desde = params.fecha;
    queryParams.fecha_hasta = params.fecha;
  }

  if (params.tipo_dia) {
    queryParams.tipo_dia = params.tipo_dia;
  }

  if (params.skip != null) {
    queryParams.skip = Number(params.skip);
  }

  if (params.limit != null) {
    queryParams.limit = Number(params.limit);
  }

  // Filtros de frontend que el backend de asistencia diaria todavía no soporta:
  // area, turno y texto libre de empleado.
  // Si no llega id_empleado, el backend todavía no tiene un listado global para consultar.
  return queryParams;
};

export const getAsistencia = async (params = {}) => {
  const queryParams = buildAsistenciaParams(params);
  if (!queryParams.id_empleado) {
    return { items: [], total: 0 };
  }

  const { id_empleado: idEmpleado, ...restParams } = queryParams;
  const response = await client.get(`${API_PREFIX}/asistencia/empleado/${idEmpleado}`, {
    params: restParams,
  });

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

export const getResumenEmpleado = async (id, mes, anio) => {
  const response = await client.get(`${API_PREFIX}/asistencia/resumen-mensual/${id}/${anio}/${mes}`);
  return response.data;
};
