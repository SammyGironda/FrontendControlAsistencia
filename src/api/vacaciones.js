import client from './client';

const API_PREFIX = '/api/v1';

// ---------------------------------------------------------------------------
// Vacacion (saldo anual por empleado/gestion)
// ---------------------------------------------------------------------------

// Listado con filtros opcionales: { id_empleado, gestion, skip, limit }
export const getVacaciones = async (params = {}) => {
  try {
    const { id_empleado, gestion, skip, limit } = params;

    const queryParams = {
      skip: typeof skip === 'number' ? skip : 0,
      limit: Number(limit) || 100,
    };

    if (id_empleado) {
      queryParams.id_empleado = Number(id_empleado);
    }

    if (gestion) {
      queryParams.gestion = Number(gestion);
    }

    const response = await client.get(`${API_PREFIX}/vacaciones/`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('getVacaciones error', error);
    throw error;
  }
};

export const getVacacion = async (id) => {
  const response = await client.get(`${API_PREFIX}/vacaciones/${id}`);
  return response.data;
};

// Devuelve null (no 404) si el empleado no tiene registro para esa gestion
export const getVacacionPorGestion = async (idEmpleado, gestion) => {
  const response = await client.get(
    `${API_PREFIX}/vacaciones/empleado/${idEmpleado}/gestion/${gestion}`
  );
  return response.data;
};

export const crearVacacion = async (data) => {
  const response = await client.post(`${API_PREFIX}/vacaciones/`, data);
  return response.data;
};

export const actualizarVacacion = async (id, data) => {
  const response = await client.put(`${API_PREFIX}/vacaciones/${id}`, data);
  return response.data;
};

// Requiere rol admin en el backend. Borra en cascada los detalles asociados.
export const eliminarVacacion = async (id) => {
  const response = await client.delete(`${API_PREFIX}/vacaciones/${id}`);
  return response.status === 204 ? null : response.data;
};

// payload: { horas: number > 0, tipo: 'goce_haber' | 'sin_goce_haber' }
export const incrementarHoras = async (id, payload) => {
  const response = await client.post(
    `${API_PREFIX}/vacaciones/${id}/incrementar-horas`,
    payload
  );
  return response.data;
};

// ---------------------------------------------------------------------------
// DetalleVacacion (cada solicitud concreta, con rango de fechas)
// ---------------------------------------------------------------------------

// Listado global de solicitudes.
// filtros: { id_empleado, estado, tipo_vacacion, fecha_desde, fecha_hasta, skip, limit }
//
// OJO 1: la barra final de '/detalles/' es obligatoria. Sin ella FastAPI
// resuelve la URL contra la ruta '/{id_vacacion}/detalles' y responde 422.
//
// OJO 2: fecha_desde/fecha_hasta filtran por CONTENCION, no por solapamiento
// (fecha_inicio >= desde AND fecha_fin <= hasta). Una solicitud que cruza el
// borde del mes no aparece si se pide justo ese mes: hay que pedir una ventana
// ampliada y recortar los rangos en el cliente.
//
// OJO 3: la respuesta NO incluye id_empleado, solo id_vacacion. Para saber de
// quien es cada solicitud hay que cruzarla contra getVacaciones().
export const getDetalles = async (params = {}) => {
  try {
    const { id_empleado, estado, tipo_vacacion, fecha_desde, fecha_hasta, skip, limit } = params;

    const queryParams = {
      skip: typeof skip === 'number' ? skip : 0,
      limit: Number(limit) || 100,
    };

    if (id_empleado) {
      queryParams.id_empleado = Number(id_empleado);
    }

    if (estado) {
      queryParams.estado = estado;
    }

    if (tipo_vacacion) {
      queryParams.tipo_vacacion = tipo_vacacion;
    }

    if (fecha_desde) {
      queryParams.fecha_desde = fecha_desde;
    }

    if (fecha_hasta) {
      queryParams.fecha_hasta = fecha_hasta;
    }

    const response = await client.get(`${API_PREFIX}/vacaciones/detalles/`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('getDetalles error', error);
    throw error;
  }
};

export const getDetalle = async (id) => {
  const response = await client.get(`${API_PREFIX}/vacaciones/detalles/${id}`);
  return response.data;
};

// Detalles de un registro de vacacion puntual. filtros: { estado, skip, limit }
export const getDetallesPorVacacion = async (idVacacion, params = {}) => {
  const response = await client.get(
    `${API_PREFIX}/vacaciones/${idVacacion}/detalles`,
    { params }
  );
  return response.data;
};

// Solicitudes en estado 'solicitado', a la espera de aprobacion
export const getDetallesPendientes = async (params = {}) => {
  try {
    const response = await client.get(
      `${API_PREFIX}/vacaciones/detalles/pendientes`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('getDetallesPendientes error', error);
    throw error;
  }
};

// El backend exige id_vacacion TAMBIEN en el body, no solo en la URL.
// horas_habiles es obligatorio y el backend NO lo calcula: lo envia el cliente.
export const crearDetalle = async (idVacacion, data) => {
  const response = await client.post(
    `${API_PREFIX}/vacaciones/${idVacacion}/detalles`,
    { ...data, id_vacacion: Number(idVacacion) }
  );
  return response.data;
};

// Solo permitido mientras la solicitud siga en estado 'solicitado'
export const actualizarDetalle = async (id, data) => {
  const response = await client.put(`${API_PREFIX}/vacaciones/detalles/${id}`, data);
  return response.data;
};

// payload: { nuevo_estado, observacion?, cubrir_con_saldo_vacacional? }
//
// Transiciones validas:
//   solicitado -> aprobado | rechazado | cancelado
//   aprobado   -> tomado   | cancelado
//
// cubrir_con_saldo_vacacional (default false) solo aplica a
// tipo_vacacion='licencia_accidente' al pasar a 'tomado': en true descuenta
// saldo vacacional, en false la licencia no consume saldo.
//
// id_aprobado_por NO se envia: el backend lo deriva del JWT. Si la cuenta
// autenticada no tiene empleado vinculado, aprobar/rechazar devuelve 400.
export const cambiarEstadoDetalle = async (id, payload) => {
  const response = await client.post(
    `${API_PREFIX}/vacaciones/detalles/${id}/cambiar-estado`,
    payload
  );
  return response.data;
};

// Requiere rol admin en el backend
export const eliminarDetalle = async (id) => {
  const response = await client.delete(`${API_PREFIX}/vacaciones/detalles/${id}`);
  return response.status === 204 ? null : response.data;
};

// ===== APOYO AL FORMULARIO DE SOLICITUD =====

// params: { id_empleado, fecha_inicio, fecha_fin } (fechas 'YYYY-MM-DD')
//
// Devuelve el costo real del rango ANTES de crear la solicitud:
//   { dias_calendario, dias_habiles, horas_por_jornada, horario_uniforme,
//     horas_habiles, dias_excluidos: [{ fecha, motivo, etiqueta }] }
//
// `motivo` es 'descanso' | 'feriado' | 'sin_horario'. `horas_habiles` es
// exactamente lo que hay que mandar despues en crearDetalle.
//
// horas_habiles puede ser "0.0" (rango de puro fin de semana): NO es un error,
// pero el backend rechaza crear un detalle con 0 porque el schema exige gt=0.
//
// Devuelve 400 si el empleado no tiene NINGUN horario asignado en el rango.
export const calcularHorasHabiles = async (params) => {
  const response = await client.get(
    `${API_PREFIX}/vacaciones/calcular-horas-habiles`,
    { params }
  );
  return response.data;
};

// data: { id_empleado, gestion }
//
// Devuelve el registro de vacacion de esa gestion, creandolo con la base LGT si
// no existe. Es idempotente: llamarlo dos veces no duplica ni suma saldos.
//
// Hace falta porque crearDetalle exige un id_vacacion y casi ningun empleado
// tiene todavia su registro de saldo.
export const asegurarGestion = async (data) => {
  const response = await client.post(`${API_PREFIX}/vacaciones/asegurar-gestion`, data);
  return response.data;
};
