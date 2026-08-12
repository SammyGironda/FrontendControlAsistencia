import client from './client';

const API_PREFIX = '/api/v1';

/**
 * GET /api/v1/empleados/{id}/horario-personalizado
 *
 * Devuelve null si el empleado NO tiene override activo. Ojo: el backend
 * responde 200 con body `null` (no 404), y devuelve lo mismo tanto si el
 * registro nunca existio como si existe con activo=false — el service filtra
 * por activo == True. Ver horario_personalizado/services.py.
 *
 * Este endpoint no tiene guard de auth; el PUT y el DELETE si exigen admin.
 */
export const getHorarioPersonalizado = async (empleadoId) => {
  const { data } = await client.get(`${API_PREFIX}/empleados/${empleadoId}/horario-personalizado`);
  return data ?? null;
};

/**
 * PUT /api/v1/empleados/{id}/horario-personalizado — upsert. Requiere rol admin.
 *
 * OJO: el backend NO hace merge parcial. `services.upsert_horario_personalizado`
 * usa `data.model_dump()` sin `exclude_unset=True`, asi que cualquier campo que
 * no se mande se escribe con su default (None / False). `data` debe traer
 * SIEMPRE los 6 campos: tolerancia_minutos, hora_entrada, hora_salida,
 * salida_flexible, activo y observacion.
 *
 * Las horas deben ir en formato "HH:MM" exacto: el field_validator del schema
 * rechaza "09:30:00" porque parte el string y espera 2 componentes.
 */
export const guardarHorarioPersonalizado = async (empleadoId, data) => {
  const response = await client.put(
    `${API_PREFIX}/empleados/${empleadoId}/horario-personalizado`,
    data
  );
  return response.data;
};

/**
 * DELETE /api/v1/empleados/{id}/horario-personalizado — soft delete. Requiere admin.
 *
 * Solo marca activo=false, no borra la fila (conserva el historial). Devuelve
 * 404 si el empleado nunca tuvo override: lo tratamos como no-op exitoso,
 * porque el efecto deseado (que no quede override activo) ya se cumple.
 */
export const desactivarHorarioPersonalizado = async (empleadoId) => {
  try {
    await client.delete(`${API_PREFIX}/empleados/${empleadoId}/horario-personalizado`);
  } catch (error) {
    if (error?.response?.status !== 404) throw error;
  }
};
