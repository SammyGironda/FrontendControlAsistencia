import client from './client';

const API_PREFIX = '/api/v1';

// Listado con filtros opcionales:
// { id_empleado, tipo_justificacion, estado_aprobacion, fecha_desde, fecha_hasta, skip, limit }
//
// tipo_justificacion: 'permiso_personal' | 'licencia_medica_accidente' |
//                     'cumpleanos' | 'vacacion_por_horas' | 'viaje_trabajo'
// estado_aprobacion:  'pendiente' | 'aprobado' | 'rechazado'
//
// OJO: igual que en vacaciones, fecha_desde/fecha_hasta filtran por CONTENCION
// (fecha_inicio >= desde AND fecha_fin <= hasta), no por solapamiento. Una
// justificacion que cruza el borde del mes no aparece si se pide justo ese mes.
export const getJustificaciones = async (params = {}) => {
  try {
    const {
      id_empleado,
      tipo_justificacion,
      estado_aprobacion,
      fecha_desde,
      fecha_hasta,
      skip,
      limit,
    } = params;

    const queryParams = {
      skip: typeof skip === 'number' ? skip : 0,
      limit: Number(limit) || 100,
    };

    if (id_empleado) {
      queryParams.id_empleado = Number(id_empleado);
    }

    if (tipo_justificacion) {
      queryParams.tipo_justificacion = tipo_justificacion;
    }

    if (estado_aprobacion) {
      queryParams.estado_aprobacion = estado_aprobacion;
    }

    if (fecha_desde) {
      queryParams.fecha_desde = fecha_desde;
    }

    if (fecha_hasta) {
      queryParams.fecha_hasta = fecha_hasta;
    }

    const response = await client.get(`${API_PREFIX}/justificaciones/`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('getJustificaciones error', error);
    throw error;
  }
};

export const getJustificacion = async (id) => {
  const response = await client.get(`${API_PREFIX}/justificaciones/${id}`);
  return response.data;
};

// Justificaciones en estado_aprobacion='pendiente'
export const getJustificacionesPendientes = async (params = {}) => {
  try {
    const response = await client.get(
      `${API_PREFIX}/justificaciones/pendientes/aprobacion`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('getJustificacionesPendientes error', error);
    throw error;
  }
};

// data: { id_empleado, fecha_inicio, fecha_fin, tipo_justificacion,
//         tipo_permiso?, es_por_horas?, hora_inicio_permiso?, hora_fin_permiso?,
//         descripcion?, documento_url? }
//
// Con es_por_horas=true ambas horas son obligatorias y hora_fin > hora_inicio.
// Con es_por_horas=false ambas deben ir en null, o el backend responde 422.
// total_horas_permiso lo calcula el backend: no se envia.
export const crearJustificacion = async (data) => {
  const response = await client.post(`${API_PREFIX}/justificaciones/`, data);
  return response.data;
};

// Solo permitido mientras la justificacion siga en estado 'pendiente'
export const actualizarJustificacion = async (id, data) => {
  const response = await client.put(`${API_PREFIX}/justificaciones/${id}`, data);
  return response.data;
};

// payload: { estado: 'aprobado' | 'rechazado', observacion? }
//
// El campo se llama 'estado' (en vacaciones el equivalente es 'nuevo_estado').
// id_aprobado_por lo deriva el backend del JWT: si la cuenta autenticada no
// tiene empleado vinculado, devuelve 400.
//
// Aprobar una justificacion de tipo 'viaje_trabajo' materializa la asistencia
// diaria del rango como tipo_dia='viaje_trabajo'.
export const aprobarJustificacion = async (id, payload) => {
  const response = await client.post(
    `${API_PREFIX}/justificaciones/${id}/aprobar`,
    payload
  );
  return response.data;
};

// Requiere rol admin en el backend
export const eliminarJustificacion = async (id) => {
  const response = await client.delete(`${API_PREFIX}/justificaciones/${id}`);
  return response.status === 204 ? null : response.data;
};
