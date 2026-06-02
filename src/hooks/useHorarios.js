import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getHorarios,
  getHorario,
  createHorario,
  updateHorario,
  deleteHorario,
} from '../api/horarios';

const QUERY_KEY = ['horarios'];

/**
 * Hook para obtener todos los horarios con React Query
 * staleTime: 2 minutos
 */
export const useHorarios = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getHorarios,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

/**
 * Hook para obtener un horario específico
 */
export const useHorario = (horarioId) => {
  return useQuery({
    queryKey: [...QUERY_KEY, horarioId],
    queryFn: () => getHorario(horarioId),
    enabled: !!horarioId,
  });
};

/**
 * Hook para crear un nuevo horario
 */
export const useCreateHorario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHorario,
    onSuccess: () => {
      // Invalidar la lista de horarios para refrescar
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

/**
 * Hook para actualizar un horario
 */
export const useUpdateHorario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ horarioId, data }) => updateHorario(horarioId, data),
    onSuccess: () => {
      // Invalidar la lista de horarios para refrescar
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

/**
 * Hook para eliminar un horario
 */
export const useDeleteHorario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHorario,
    onSuccess: () => {
      // Invalidar la lista de horarios para refrescar
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};
