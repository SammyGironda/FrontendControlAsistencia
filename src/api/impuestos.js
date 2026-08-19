import client from './client';

// Cada archivo de api/ define su propio prefijo: client.js solo aporta el
// baseURL del env.
const API_PREFIX = '/api/v1';

// Las tasas cuelgan del router de ajustes salariales, no de uno propio.
const BASE = `${API_PREFIX}/ajustes-salariales/parametros-impuesto`;

/**
 * Todas las tasas registradas, vigentes e historicas, de todos los conceptos.
 *
 * Se pide esto y no /vigentes + un /historial por concepto porque un concepto
 * cuya vigencia se cerro y nunca se reemplazo no aparece entre los vigentes:
 * su historial nunca se pediria y el concepto desapareceria de la pantalla.
 *
 * Sin barra final: la ruta se declaro asi en el backend para emparejar con el
 * POST y no lidiar con el 307 de FastAPI.
 */
export const getParametrosImpuesto = async () => {
  const response = await client.get(BASE);
  return response.data;
};

/**
 * Registra una tasa nueva. El backend cierra la vigencia de la anterior del
 * mismo concepto en la misma transaccion (fecha_vigencia_fin = inicio - 1 dia).
 *
 * Solo admin: responde 403 para cualquier otro rol.
 */
export const crearParametroImpuesto = async (data) => {
  const response = await client.post(BASE, data);
  return response.data;
};
