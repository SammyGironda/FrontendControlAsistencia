import dayjs from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('es');
dayjs.extend(relativeTime);

export const formatFecha = (isoString) => {
  if (!isoString) return '';
  return dayjs(isoString).format('DD/MM/YYYY');
};

export const formatFechaHora = (isoString) => {
  if (!isoString) return '';
  return dayjs(isoString).format('DD/MM/YYYY HH:mm');
};

export const formatMoneda = (numero) => {
  if (typeof numero !== 'number') return '';
  return `Bs. ${numero.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const calcularAntiguedad = (fechaIngreso) => {
  if (!fechaIngreso) return '';
  const ingreso = dayjs(fechaIngreso);
  const ahora = dayjs();
  const diffYears = ahora.diff(ingreso, 'year');
  const diffMonths = ahora.diff(ingreso, 'month') % 12;

  let result = '';
  if (diffYears > 0) {
    result += `${diffYears} año${diffYears > 1 ? 's' : ''}`;
  }
  if (diffMonths > 0) {
    if (result) result += ' ';
    result += `${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
  }
  return result || 'Menos de un mes';
};

// Las columnas NUMERIC/Decimal del backend (horas, saldos vacacionales) viajan
// como STRING en el JSON: "8.0", no 8. Sumarlas sin castear concatena texto.
// Devuelve 0 ante null/undefined/'' o cualquier cosa no numerica.
export const aNumero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

// "8.0 h" — una sola decimal, que es la precision real de la columna (4,1).
export const formatearHoras = (valor) => `${aNumero(valor).toFixed(1)} h`;

// "13.00 %" — dos decimales, la precision real de la columna NUMERIC(5,2).
// Usa aNumero y no formatMoneda porque los Decimal del backend viajan como
// STRING ("13.00") y formatMoneda devuelve '' para todo lo que no sea number.
export const formatearPorcentaje = (valor) => `${aNumero(valor).toFixed(2)} %`;

export const horasADias = (horas) => {
  if (typeof horas !== 'number') return 0;
  return parseFloat((horas / 8).toFixed(1));
};

export const estadoColor = (estado) => {
  const base = {
    presente: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400' },
    ausente: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400' },
    feriado: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-400' },
    retraso: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
    permiso_parcial: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-400' },
    licencia_medica: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-400' },
    presente_exento: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-400' },
    descanso: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-400' },
    default: { bg: 'bg-gray-200', text: 'text-gray-700', border: 'border-gray-300' },
  };
  return base[estado] || base.default;
};