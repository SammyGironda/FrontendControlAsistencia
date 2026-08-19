import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDepartamentos,
  crearDepartamento,
  actualizarDepartamento,
  desactivarDepartamento,
  reactivarDepartamento,
} from '../api/departamentos';

const QUERY_KEY = ['departamentos'];
const CINCO_MINUTOS = 5 * 60 * 1000;

// Lista PLANA de departamentos, incluidos los inactivos. El arbol se arma en el
// cliente con lib/arbolDepartamentos.js — ver el porque en el docstring de ese
// archivo (GET /raiz esconde los desactivados y no permitiria reactivarlos).
export const useDepartamentos = () =>
  useQuery({
    queryKey: QUERY_KEY,
    queryFn: getDepartamentos,
    staleTime: CINCO_MINUTOS,
  });

export const useCrearDepartamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crearDepartamento,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useActualizarDepartamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => actualizarDepartamento(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

// Es un soft-delete: el departamento sigue existiendo con activo = false.
// El backend rechaza con 400 si tiene subdepartamentos activos, cargos o
// empleados activos (RN-22).
export const useDesactivarDepartamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: desactivarDepartamento,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useReactivarDepartamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reactivarDepartamento,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

// Traduce los errores del backend a algo accionable, en el mismo espiritu que
// mensajeDeError de useUsuarios.js y useVacaciones.js.
//
// El 422 se arma aparte porque FastAPI lo devuelve como ARRAY de objetos de
// validacion, no como string: pintarlo crudo muestra "[object Object]". Pasa de
// verdad en esta pantalla — un codigo de 1 caracter viola el min_length=2 del
// schema y vuelve como 422, no como 400.
//
// Los errores de RN-22 son 400 con `detail` string y traen el conteo exacto
// ("...porque tiene 3 empleado(s) activo(s)"), asi que caen en el ultimo branch
// y se muestran verbatim: el backend ya explica mejor que cualquier reescritura.
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
    return 'Tu rol no tiene permiso para esta acción. Solo un administrador puede modificar la estructura organizacional.';
  }

  if (typeof detail === 'string') return detail;

  return fallback;
};
