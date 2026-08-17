import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  toggleActivoUsuario,
  resetearPassword,
} from '../api/usuarios';
import { getRoles } from '../api/roles';
import { getEmpleados } from '../api/empleados';

const QUERY_KEY = ['usuarios'];
const CINCO_MINUTOS = 5 * 60 * 1000;

export const useUsuarios = () =>
  useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getUsuarios({ limit: 200 }),
    staleTime: CINCO_MINUTOS,
  });

// El catalogo de roles, para el selector del alta. Comparte la query key con
// la pantalla de Roles del Sistema a proposito: es el mismo dato y conviene
// que se invaliden juntos.
export const useRolesCatalogo = () =>
  useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    staleTime: CINCO_MINUTOS,
  });

// Empleados candidatos a tener cuenta.
//
// NO manda incluir_baja: el backend rechaza con 400 crear una cuenta para un
// empleado dado de baja, asi que ofrecerlos seria ofrecer un error. Sin ese
// flag, get_all_empleados devuelve activo, por_habilitar y suspendido — que son
// exactamente los elegibles.
//
// Query key propia para no pisar la de otras pantallas, que piden otros filtros.
export const useEmpleadosParaCuenta = () =>
  useQuery({
    queryKey: ['empleados', 'para-cuenta'],
    queryFn: () => getEmpleados({ limit: 500 }),
    staleTime: CINCO_MINUTOS,
  });

export const useCrearUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crearUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      // El padron de empleados no cambia, pero si cambia quien tiene cuenta:
      // el selector del alta filtra por eso y quedaria ofreciendo un empleado
      // que ya no corresponde.
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
    },
  });
};

export const useActualizarUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => actualizarUsuario(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useEliminarUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eliminarUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
    },
  });
};

export const useToggleActivoUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleActivoUsuario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

// Devuelve { id, username, password_temporal, requiere_cambio_password }.
// La contrasena hay que mostrarla en el momento: no se puede volver a pedir.
export const useResetearPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetearPassword,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

// Traduce los errores del backend a algo accionable, en el mismo espiritu que
// mensajeDeError de useVacaciones.js.
//
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
    return 'Tu rol no tiene permiso para esta acción. Solo un administrador puede gestionar cuentas.';
  }

  if (typeof detail === 'string') return detail;

  return fallback;
};
