import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getVacaciones, getDetalles, getDetallesPendientes, cambiarEstadoDetalle } from '../api/vacaciones';
import { getJustificaciones, getJustificacionesPendientes, aprobarJustificacion } from '../api/justificaciones';
import { getFeriados } from '../api/feriados';
import { ventanaAmpliada } from '../lib/calendarioVacaciones';

const FIVE_MINUTES = 1000 * 60 * 5;

// Traduce el error de axios a un mensaje entendible para RRHH.
// El backend distingue 401 (sesion invalida, la maneja el interceptor de
// client.js deslogueando) de 403 (rol insuficiente, no desloguea) y de 400
// (por ejemplo: la cuenta autenticada no tiene empleado vinculado).
export const mensajeDeError = (error, porDefecto = 'Ocurrió un error inesperado') => {
  const detail = error?.response?.data?.detail;
  const status = error?.response?.status;

  if (status === 403) {
    return typeof detail === 'string' && detail
      ? detail
      : 'Tu rol no tiene permiso para realizar esta acción.';
  }

  if (status === 400 && typeof detail === 'string' && detail.toLowerCase().includes('empleado')) {
    return `${detail} Tu usuario no está vinculado a un empleado: RRHH debe vincularlo para que puedas aprobar solicitudes.`;
  }

  if (typeof detail === 'string' && detail) return detail;

  // FastAPI devuelve una lista de errores en los 422 de validacion
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item.msg).filter(Boolean).join(' · ') || porDefecto;
  }

  return porDefecto;
};

// ---------------------------------------------------------------------------
// Queries del calendario
// ---------------------------------------------------------------------------

// Todos los registros de vacacion, sin filtrar por gestion: sirven para armar
// el mapa id_vacacion -> id_empleado, porque DetalleVacacionResponse no trae
// id_empleado. Sin filtro de gestion porque un rango que cruza dic/ene puede
// colgar de la gestion anterior a la que se esta viendo.
export const useVacacionesTodas = () =>
  useQuery({
    queryKey: ['vacaciones', 'todas'],
    queryFn: () => getVacaciones({ limit: 500 }),
    staleTime: FIVE_MINUTES,
  });

// Solicitudes de vacacion que tocan el mes visible.
// Se pide una ventana ampliada (+-1 mes) porque el filtro del backend es de
// contencion; el recorte al mes real lo hace expandirRango() en el cliente.
export const useDetallesMes = (anio, mes, idEmpleado) =>
  useQuery({
    queryKey: ['vacaciones', 'detalles', anio, mes, idEmpleado],
    queryFn: () =>
      getDetalles({
        ...ventanaAmpliada(anio, mes),
        ...(idEmpleado ? { id_empleado: idEmpleado } : {}),
        limit: 500,
      }),
    enabled: Boolean(anio && mes),
    staleTime: FIVE_MINUTES,
  });

// Viajes de trabajo aprobados que tocan el mes visible
export const useViajesTrabajoMes = (anio, mes, idEmpleado) =>
  useQuery({
    queryKey: ['justificaciones', 'viaje_trabajo', anio, mes, idEmpleado],
    queryFn: () =>
      getJustificaciones({
        tipo_justificacion: 'viaje_trabajo',
        estado_aprobacion: 'aprobado',
        ...ventanaAmpliada(anio, mes),
        ...(idEmpleado ? { id_empleado: idEmpleado } : {}),
        limit: 500,
      }),
    enabled: Boolean(anio && mes),
    staleTime: FIVE_MINUTES,
  });

// Feriados activos. No se filtra por anio: el backend los trata como
// recurrentes por dia+mes y el match se hace asi en construirMapaDias().
export const useFeriadosActivos = () =>
  useQuery({
    queryKey: ['feriados', 'activos'],
    queryFn: () => getFeriados({ activo: true, limit: 500 }),
    staleTime: FIVE_MINUTES,
  });

// ---------------------------------------------------------------------------
// Queries del panel de pendientes
// ---------------------------------------------------------------------------

export const useDetallesPendientes = () =>
  useQuery({
    queryKey: ['vacaciones', 'detalles', 'pendientes'],
    queryFn: () => getDetallesPendientes({ limit: 200 }),
    staleTime: FIVE_MINUTES,
  });

export const useJustificacionesPendientes = () =>
  useQuery({
    queryKey: ['justificaciones', 'pendientes'],
    queryFn: () => getJustificacionesPendientes({ limit: 200 }),
    staleTime: FIVE_MINUTES,
  });

// ---------------------------------------------------------------------------
// Mutations de aprobacion
// ---------------------------------------------------------------------------

// payload: { nuevo_estado, observacion?, cubrir_con_saldo_vacacional? }
export const useCambiarEstadoDetalle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => cambiarEstadoDetalle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacaciones'] });
      toast.success('Solicitud de vacación actualizada');
    },
    onError: (error) => {
      toast.error(mensajeDeError(error, 'No se pudo actualizar la solicitud de vacación'));
    },
  });
};

// payload: { estado: 'aprobado' | 'rechazado', observacion? }
export const useAprobarJustificacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => aprobarJustificacion(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['justificaciones'] });
      // Aprobar un viaje_trabajo escribe asistencia_diaria del rango
      queryClient.invalidateQueries({ queryKey: ['asistencia'] });
      toast.success('Justificación actualizada');
    },
    onError: (error) => {
      toast.error(mensajeDeError(error, 'No se pudo actualizar la justificación'));
    },
  });
};
