import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getVacaciones,
  getDetalles,
  getDetallesPendientes,
  cambiarEstadoDetalle,
  getVacacionPorGestion,
  calcularHorasHabiles,
  asegurarGestion,
  crearDetalle,
} from '../api/vacaciones';
import { getJustificaciones, getJustificacionesPendientes, aprobarJustificacion } from '../api/justificaciones';
import { getFeriados } from '../api/feriados';
import { getEmpleados } from '../api/empleados';
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

  // Match sobre la frase exacta que emite el backend (core/deps.py y
  // vacaciones/services.py), no sobre la palabra 'empleado' suelta: hay otros
  // 400 que la mencionan ("El empleado N no tiene horario asignado...") y no
  // tienen nada que ver con la vinculacion de la cuenta.
  if (
    status === 400 &&
    typeof detail === 'string' &&
    detail.toLowerCase().includes('vinculado a un empleado')
  ) {
    return `${detail} RRHH debe vincular tu usuario a un empleado para que puedas realizar esta acción.`;
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

// ---------------------------------------------------------------------------
// Formulario de nueva solicitud
// ---------------------------------------------------------------------------

// Padron COMPLETO, incluidos los empleados dados de baja.
//
// El useEmpleados() de hooks/useAsistencia NO sirve para este selector: no manda
// `estado`, y en ese caso get_all_empleados excluye los 'baja' por su cuenta
// (`elif not incluir_baja`). Devuelve activo/por_habilitar/suspendido, pero no
// el padron entero.
//
// Se necesita completo porque una vacacion pendiente se puede liquidar despues
// de la baja (finiquito). Va en un hook aparte, con su propia query key, para no
// cambiar lo que ven las demas pantallas que comparten ['empleados'].
export const useEmpleadosTodos = () =>
  useQuery({
    queryKey: ['empleados', 'incluye-baja'],
    queryFn: () => getEmpleados({ limit: 500, incluir_baja: true }),
    staleTime: FIVE_MINUTES,
  });

// Costo real del rango, para mostrarlo antes de enviar la solicitud.
// La query key incluye las 3 entradas, asi que react-query refetchea solo
// cuando cambia alguna: no hace falta debounce ni un boton de "calcular".
export const useCalculoHorasHabiles = (idEmpleado, fechaInicio, fechaFin) => {
  const rangoValido = Boolean(fechaInicio && fechaFin && fechaFin >= fechaInicio);

  return useQuery({
    queryKey: ['vacaciones', 'horas-habiles', idEmpleado, fechaInicio, fechaFin],
    queryFn: () =>
      calcularHorasHabiles({
        id_empleado: idEmpleado,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      }),
    enabled: Boolean(idEmpleado) && rangoValido,
    staleTime: FIVE_MINUTES,
    // El 400 de "sin horario asignado" es una respuesta definitiva sobre los
    // datos, no un fallo transitorio: reintentarlo solo demora el mensaje.
    retry: false,
  });
};

// Saldo del empleado para esa gestion. Devuelve null si todavia no existe: el
// formulario lo trata como "se creara al enviar", no como un error.
// Es una lectura pura, no crea nada (eso lo hace asegurarGestion al enviar).
export const useSaldoGestion = (idEmpleado, gestion) =>
  useQuery({
    queryKey: ['vacaciones', 'saldo', idEmpleado, gestion],
    queryFn: () => getVacacionPorGestion(idEmpleado, gestion),
    enabled: Boolean(idEmpleado && gestion),
    staleTime: FIVE_MINUTES,
  });

// Crea la solicitud en estado 'solicitado'.
//
// Son dos llamadas encadenadas dentro de UNA mutationFn: primero se asegura el
// registro de vacacion de la gestion (idempotente) porque crearDetalle exige un
// id_vacacion, y recien despues se crea el detalle. Van juntas para que un fallo
// del segundo paso llegue por el mismo onError y el usuario no quede sin saber
// que paso.
//
// argumentos: { idEmpleado, gestion, detalle }
//   detalle: { fecha_inicio, fecha_fin, horas_habiles, tipo_vacacion, observacion? }
export const useCrearSolicitud = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ idEmpleado, gestion, detalle }) => {
      const vacacion = await asegurarGestion({ id_empleado: idEmpleado, gestion });
      return crearDetalle(vacacion.id, detalle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacaciones'] });
      toast.success('Solicitud registrada. Queda pendiente de aprobación.');
    },
    onError: (error) => {
      toast.error(mensajeDeError(error, 'No se pudo registrar la solicitud'));
    },
  });
};
