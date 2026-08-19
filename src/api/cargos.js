import client from './client';

const API_PREFIX = '/api/v1';

// Cliente de /api/v1/cargos — el PUESTO DE TRABAJO (analista, jefe de area...).
// No confundir con `rol`, que son los permisos del sistema.
//
// Un cargo pertenece a un departamento (cargo.id_departamento, NOT NULL), asi que
// el catalogo se puede acotar a una unidad organizacional.
//
// OJO: estos 5 endpoints todavia estan ABIERTOS (sin guard). No asumir que un
// 200 aca significa que el token sirve.

/**
 * @param {object}  params
 * @param {number} [params.id_departamento] acota a los cargos de un departamento.
 * @param {boolean} [params.activo_only] el backend lo tiene en TRUE por defecto:
 *   sin pasarlo explicitamente en false, los cargos desactivados NO vuelven. Eso
 *   importa para resolver nombres — un empleado puede seguir asignado a un cargo
 *   que despues se desactivo, y sin el nombre la tabla mostraria el id crudo.
 */
export const getCargos = async ({ id_departamento, activo_only } = {}) => {
  const params = { limit: 500 };
  if (id_departamento) params.id_departamento = Number(id_departamento);
  if (activo_only !== undefined) params.activo_only = activo_only;

  const response = await client.get(`${API_PREFIX}/cargos/`, { params });
  return response.data;
};

export const getCargo = async (id) => {
  const response = await client.get(`${API_PREFIX}/cargos/${id}`);
  return response.data;
};
