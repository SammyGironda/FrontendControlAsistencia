import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmpleados, getEmpleado, crearEmpleado, actualizarEmpleado } from '../api/empleados';

export const useEmpleados = (params) => {
  return useQuery({
    queryKey: ['empleados', params],
    queryFn: () => getEmpleados(params),
    keepPreviousData: true,
  });
};

export const useEmpleado = (id) => {
  return useQuery({
    queryKey: ['empleado', id],
    queryFn: () => getEmpleado(id),
    enabled: !!id,
  });
};

export const useCrearEmpleado = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearEmpleado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
    },
  });
};

export const useActualizarEmpleado = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => actualizarEmpleado(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      queryClient.invalidateQueries({ queryKey: ['empleado', variables.id] });
    },
  });
};
