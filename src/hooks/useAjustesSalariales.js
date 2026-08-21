import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarDecreto,
  crearDecreto,
  getAjustesDeDecreto,
  getDecretos,
} from '../api/ajustesSalariales';

const QUERY_KEY = ['decretos'];
const CINCO_MINUTOS = 5 * 60 * 1000;

export const useDecretos = () =>
  useQuery({
    queryKey: QUERY_KEY,
    queryFn: getDecretos,
    staleTime: CINCO_MINUTOS,
  });

// Trazabilidad de un decreto puntual. Se usa tanto para el botón "Ver ajustes
// generados" como para que DecretoModal decida si un decreto se puede editar
// (bloqueado en el backend si ya tiene algún ajuste).
export const useAjustesDeDecreto = (decretoId) =>
  useQuery({
    queryKey: [...QUERY_KEY, decretoId, 'ajustes'],
    queryFn: () => getAjustesDeDecreto(decretoId),
    enabled: Boolean(decretoId),
    staleTime: CINCO_MINUTOS,
  });

export const useCrearDecreto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearDecreto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useActualizarDecreto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => actualizarDecreto(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

// Mismo patrón que useImpuestos.js / useDepartamentos.js: el 422 llega como
// ARRAY de objetos de validación, no como string.
export const mensajeDeError = (error, fallback = 'No se pudo completar la operación.') => {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;

  if (status === 422) {
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || JSON.stringify(d)).join('. ');
    }
    return typeof detail === 'string' ? detail : 'Los datos enviados no son válidos.';
  }

  if (status === 403) {
    return 'Tu rol no tiene permiso para esta acción. Sólo un administrador puede crear o editar decretos.';
  }

  // Los 400 del backend (año duplicado, decreto ya aplicado, rango de tramo
  // inválido) traen un detail accionable — se muestra tal cual.
  if (typeof detail === 'string') return detail;

  return fallback;
};
