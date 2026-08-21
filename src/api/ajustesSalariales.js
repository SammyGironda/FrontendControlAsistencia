import client from './client';

const API_PREFIX = '/api/v1';
const BASE = `${API_PREFIX}/ajustes-salariales`;

// Cliente de decretos de incremento salarial (rrhh.decreto_incremento_salarial
// + rrhh.condicion_decreto) y su trazabilidad hacia rrhh.ajuste_salarial.
//
// Desde el 2026-08-20 el módulo entero exige JWT: crear/editar un decreto es
// admin, leer (listado, detalle, ajustes generados) es admin+rrhh.
//
// A propósito NO hay cliente para POST /decretos/{id}/aplicar: no es
// idempotente (dos ejecuciones duplican ajustes por empleado) y un decreto
// con fecha_vigencia futura nunca sincroniza empleado.salario_base (no existe
// worker que lo haga). Ver CLAUDE.md antes de agregarlo.

export const getDecretos = async () => {
  const response = await client.get(`${BASE}/decretos`, { params: { limit: 500 } });
  return response.data;
};

export const getDecreto = async (id) => {
  const response = await client.get(`${BASE}/decretos/${id}`);
  return response.data;
};

// condiciones: [{ orden, salario_desde, salario_hasta, porcentaje_incremento }]
export const crearDecreto = async (data) => {
  const response = await client.post(`${BASE}/decretos`, data);
  return response.data;
};

// Reemplaza cabecera + tramos completos. El backend rechaza con 400 si el
// decreto ya generó algún ajuste salarial (ver services.actualizar_decreto).
export const actualizarDecreto = async (id, data) => {
  const response = await client.put(`${BASE}/decretos/${id}`, data);
  return response.data;
};

// Trazabilidad: los AjusteSalarial generados bajo los tramos de este decreto.
export const getAjustesDeDecreto = async (id) => {
  const response = await client.get(`${BASE}/decretos/${id}/ajustes`);
  return response.data;
};
