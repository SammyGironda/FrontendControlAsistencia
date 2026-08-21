import { parsearFechaLocal } from './calendarioVacaciones';

/**
 * Helpers de la pantalla de Incrementos Salariales por Decreto.
 *
 * Viven en lib/ y no en el .jsx porque un archivo de componente que exporta
 * además constantes o funciones rompe react-refresh/only-export-components.
 */

// Tope real de la columna condicion_decreto.porcentaje_incremento NUMERIC(5,2).
export const PORCENTAJE_MAX = 999.99;

// Fecha de hoy a medianoche local. Mismo motivo que en lib/tasasImpuesto.js:
// comparar contra un Date con hora haría que un decreto vigente hoy quedara
// "futuro" hasta la medianoche.
const hoyLocal = () => {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
};

/**
 * 'vigente' | 'futuro' según la fecha_vigencia del decreto.
 *
 * Las fechas del backend llegan como 'YYYY-MM-DD' — se parsean con
 * parsearFechaLocal por el mismo motivo que en toda la app: el constructor
 * de Date interpreta esas fechas como UTC y en Bolivia (UTC-4) caen un día
 * antes.
 */
export const estadoDeDecreto = (fechaVigencia, hoy = hoyLocal()) => {
  const fecha = parsearFechaLocal(fechaVigencia);
  if (!fecha) return 'vigente';
  return fecha > hoy ? 'futuro' : 'vigente';
};

/**
 * "Bs. 0 – Bs. 2.500" / "Bs. 5.001 o más" / "Tasa única" (ambos NULL).
 *
 * Los valores llegan como string (columna Decimal) o ya como number desde el
 * formulario; se muestran tal cual sin aritmética, así que no hace falta
 * aNumero acá — sólo formatear con separador de miles.
 */
const formatoMiles = (valor) => Number(valor).toLocaleString('es-BO', { maximumFractionDigits: 2 });

export const formatearRangoSalario = (desde, hasta) => {
  const tieneDesde = desde !== null && desde !== undefined && desde !== '';
  const tieneHasta = hasta !== null && hasta !== undefined && hasta !== '';

  if (!tieneDesde && !tieneHasta) return 'Tasa única (todos los salarios)';
  if (!tieneDesde) return `Hasta Bs. ${formatoMiles(hasta)}`;
  if (!tieneHasta) return `Desde Bs. ${formatoMiles(desde)}`;
  return `Bs. ${formatoMiles(desde)} – Bs. ${formatoMiles(hasta)}`;
};

/**
 * Bloqueos duros sobre la lista de tramos, espejando las validaciones del
 * backend (CondicionDecretoBase + DecretoCreate en schemas.py) para avisar
 * mientras se escribe en vez de mandar el request y traducir un 422. La
 * validación que manda sigue siendo la del backend.
 *
 * Devuelve un array de strings; vacío = sin errores.
 */
export const validarTramos = (tramos) => {
  const errores = [];
  const lista = Array.isArray(tramos) ? tramos : [];

  if (lista.length === 0) {
    errores.push('El decreto necesita al menos un tramo.');
    return errores;
  }

  const ordenes = lista.map((t) => t.orden);
  if (new Set(ordenes).size !== ordenes.length) {
    errores.push('Hay tramos con el mismo orden: cada uno debe ser único.');
  }

  lista.forEach((tramo, i) => {
    const fila = `Tramo ${i + 1}`;

    if (tramo.porcentaje_incremento === '' || tramo.porcentaje_incremento === null
      || tramo.porcentaje_incremento === undefined) {
      errores.push(`${fila}: falta el porcentaje de incremento.`);
    } else {
      const pct = Number(tramo.porcentaje_incremento);
      if (!Number.isFinite(pct) || pct < 0 || pct > PORCENTAJE_MAX) {
        errores.push(`${fila}: el porcentaje debe estar entre 0 y ${PORCENTAJE_MAX}.`);
      }
    }

    const tieneDesde = tramo.salario_desde !== '' && tramo.salario_desde !== null
      && tramo.salario_desde !== undefined;
    const tieneHasta = tramo.salario_hasta !== '' && tramo.salario_hasta !== null
      && tramo.salario_hasta !== undefined;

    if (tieneDesde && tieneHasta && Number(tramo.salario_hasta) <= Number(tramo.salario_desde)) {
      errores.push(`${fila}: "hasta" debe ser mayor que "desde".`);
    }
  });

  return errores;
};
