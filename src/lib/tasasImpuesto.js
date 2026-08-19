import { parsearFechaLocal } from './calendarioVacaciones';

/**
 * Helpers de la pantalla de Impuestos y Descuentos Legales.
 *
 * Viven en lib/ y no en el .jsx porque un archivo de componente que exporta
 * ademas constantes o funciones rompe react-refresh/only-export-components.
 */

export const LABORAL = 'LABORAL';
export const PATRONAL = 'PATRONAL';

// Fecha de hoy a medianoche local. Comparar contra un Date con hora haria que
// una tasa que empieza hoy quedara "en el futuro" hasta la medianoche.
const hoyLocal = () => {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
};

/**
 * Estado de una tasa respecto de una fecha: 'vigente' | 'programada' | 'cerrada'.
 *
 * Las fechas del backend llegan como 'YYYY-MM-DD' y se parsean con
 * parsearFechaLocal: new Date('2026-08-19') se interpreta como UTC y en Bolivia
 * (UTC-4) cae el dia anterior, asi que el constructor daria el resultado
 * equivocado justo en los bordes, que es donde importa.
 */
export const estadoDeTasa = (tasa, hoy = hoyLocal()) => {
  const inicio = parsearFechaLocal(tasa?.fecha_vigencia_inicio);
  if (!inicio) return 'cerrada';

  if (inicio > hoy) return 'programada';

  const fin = parsearFechaLocal(tasa?.fecha_vigencia_fin);
  // fecha_vigencia_fin es INCLUSIVA: el backend y la vista SQL filtran
  // `fecha_vigencia_fin >= fecha`. Una tasa que termina hoy sigue vigente hoy.
  if (fin && fin < hoy) return 'cerrada';

  return 'vigente';
};

const porNombre = (a, b) => String(a).localeCompare(String(b), 'es');

// Mas reciente primero.
const porInicioDesc = (a, b) =>
  String(b.fecha_vigencia_inicio || '').localeCompare(String(a.fecha_vigencia_inicio || ''));

/**
 * Agrupa las tasas en los tres cubos que muestra la pantalla.
 *
 * Devuelve:
 *   vigentes:    { LABORAL: [...], PATRONAL: [...] }  una tasa por concepto
 *   programadas: Map nombre -> tasa que aun no entro en vigencia
 *   historial:   [...] tasas ya cerradas, por concepto y fecha descendente
 *   conceptos:   [{ nombre, tipo_aporte }] catalogo para el desplegable del alta
 *
 * Un concepto puede tener SOLO historial (su vigencia se cerro y nadie la
 * reemplazo). Ese caso no aparece en `vigentes` pero si en `historial` y en
 * `conceptos`: es justamente el que hay que poder ver para arreglarlo.
 */
export const agruparPorConcepto = (lista, hoy = hoyLocal()) => {
  const tasas = Array.isArray(lista) ? lista : [];

  const vigentes = { [LABORAL]: [], [PATRONAL]: [] };
  const programadas = new Map();
  const historial = [];
  const conceptos = new Map();

  for (const tasa of tasas) {
    if (!tasa?.nombre) continue;

    if (!conceptos.has(tasa.nombre)) {
      conceptos.set(tasa.nombre, { nombre: tasa.nombre, tipo_aporte: tasa.tipo_aporte });
    }

    const estado = estadoDeTasa(tasa, hoy);

    if (estado === 'vigente') {
      // El tipo_aporte de una fila corrupta no deberia existir (el backend lo
      // valida), pero si llega algo raro va a LABORAL antes que perderse.
      const cubo = tasa.tipo_aporte === PATRONAL ? PATRONAL : LABORAL;
      vigentes[cubo].push(tasa);
    } else if (estado === 'programada') {
      // Si hubiera mas de una programada del mismo concepto se muestra la mas
      // proxima a entrar en vigencia.
      const previa = programadas.get(tasa.nombre);
      if (!previa || tasa.fecha_vigencia_inicio < previa.fecha_vigencia_inicio) {
        programadas.set(tasa.nombre, tasa);
      }
    } else {
      historial.push(tasa);
    }
  }

  vigentes[LABORAL].sort((a, b) => porNombre(a.nombre, b.nombre));
  vigentes[PATRONAL].sort((a, b) => porNombre(a.nombre, b.nombre));
  historial.sort((a, b) => porNombre(a.nombre, b.nombre) || porInicioDesc(a, b));

  return {
    vigentes,
    programadas,
    historial,
    conceptos: [...conceptos.values()].sort((a, b) => porNombre(a.nombre, b.nombre)),
  };
};

/**
 * Texto libre -> nombre de concepto canonico (MAYUSCULA_CON_GUION_BAJO).
 *
 * Espeja services._slug() del backend: NFKD, descarte de diacriticos
 * combinantes, y filtrado a [A-Z0-9_]. Importa porque la vista SQL compara
 * `p.nombre = 'RC_IVA'` CASE-SENSITIVE: un concepto con acento o minusculas
 * queda muerto, nunca entra a ningun calculo y nadie se entera.
 */
export const normalizarNombreConcepto = (texto) =>
  String(texto || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * La fecha en que quedaria cerrada una tasa si otra empieza en `inicio`.
 *
 * Un dia antes y no el mismo dia, igual que create_parametro_impuesto: el
 * backend y la vista filtran `fecha_vigencia_fin >= fecha` (inclusive), asi que
 * cerrar en la misma fecha dejaria un dia con las dos tasas vigentes.
 */
export const fechaDeCierre = (inicio) => {
  const fecha = parsearFechaLocal(inicio);
  if (!fecha) return null;

  const cierre = new Date(fecha);
  cierre.setDate(cierre.getDate() - 1);
  return cierre;
};
