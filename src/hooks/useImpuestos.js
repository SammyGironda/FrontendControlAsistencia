import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { crearParametroImpuesto, getParametrosImpuesto } from '../api/impuestos';

const QUERY_KEY = ['parametros-impuesto'];
const CINCO_MINUTOS = 5 * 60 * 1000;

export const useParametrosImpuesto = () =>
  useQuery({
    queryKey: QUERY_KEY,
    queryFn: getParametrosImpuesto,
    staleTime: CINCO_MINUTOS,
  });

export const useCrearParametroImpuesto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearParametroImpuesto,
    // Invalida siempre, no solo la fila nueva: el alta tambien CIERRA la tasa
    // anterior, asi que hay dos filas cambiadas por request.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

// El 422 se arma aparte porque FastAPI lo devuelve como ARRAY de objetos de
// validacion, no como string: pintarlo crudo muestra "[object Object]".
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
    return 'Tu rol no tiene permiso para esta acción. Solo un administrador puede registrar tasas de impuestos.';
  }

  // Los 400 del backend traen un detail accionable (tipo de aporte que no
  // coincide, fecha anterior a la tasa que reemplaza, solapamiento). Se muestra
  // tal cual: explica mejor que cualquier texto generico de acá.
  if (typeof detail === 'string') return detail;

  return fallback;
};
