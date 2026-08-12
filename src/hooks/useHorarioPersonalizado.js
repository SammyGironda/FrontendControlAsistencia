import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getHorarioPersonalizado,
  guardarHorarioPersonalizado,
  desactivarHorarioPersonalizado,
} from '../api/horarioPersonalizado';
import { mensajeDeError } from './useVacaciones';

const claveOverride = (empleadoId) => ['horario-personalizado', empleadoId];

/**
 * Override de horario del empleado. `data` es null cuando no hay uno activo.
 * staleTime en 0: la unica pantalla que lo lee es tambien la que lo edita, asi
 * que conviene refetchear al abrir el drawer en vez de mostrar cache vieja.
 */
export const useHorarioPersonalizado = (empleadoId) =>
  useQuery({
    queryKey: claveOverride(empleadoId),
    queryFn: () => getHorarioPersonalizado(empleadoId),
    enabled: Boolean(empleadoId),
    staleTime: 0,
  });

export const useGuardarHorarioPersonalizado = (empleadoId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => guardarHorarioPersonalizado(empleadoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claveOverride(empleadoId) });
      // El override pisa hora_entrada_efectiva y tolerancia_efectiva en
      // asistencia_diaria/services.py, asi que el efecto cruza de modulo.
      queryClient.invalidateQueries({ queryKey: ['asistencia'] });
      toast.success('Horario personalizado guardado');
    },
    onError: (error) => {
      toast.error(mensajeDeError(error, 'No se pudo guardar el horario personalizado'));
    },
  });
};

export const useDesactivarHorarioPersonalizado = (empleadoId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => desactivarHorarioPersonalizado(empleadoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claveOverride(empleadoId) });
      queryClient.invalidateQueries({ queryKey: ['asistencia'] });
      toast.success('El empleado vuelve a usar el horario general');
    },
    onError: (error) => {
      toast.error(mensajeDeError(error, 'No se pudo quitar el horario personalizado'));
    },
  });
};
