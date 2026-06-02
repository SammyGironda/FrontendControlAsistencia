import { useQuery } from '@tanstack/react-query';
import { getEmpleados } from '../api/empleados';
import { getAsistenciaEmpleado, getResumenMensual } from '../api/asistencia';

const FIVE_MINUTES = 1000 * 60 * 5;

export const useEmpleados = () => {
  return useQuery({
    queryKey: ['empleados'],
    queryFn: () => getEmpleados({ limit: 500 }),
    staleTime: FIVE_MINUTES,
    keepPreviousData: true,
  });
};

export const useAsistenciaEmpleado = (idEmpleado) => {
  return useQuery({
    queryKey: ['asistencia', idEmpleado],
    queryFn: () => getAsistenciaEmpleado(idEmpleado),
    enabled: !!idEmpleado,
    staleTime: FIVE_MINUTES,
  });
};

export const useResumenMensual = (idEmpleado, anio, mes) => {
  return useQuery({
    queryKey: ['resumen', idEmpleado, anio, mes],
    queryFn: () => getResumenMensual(idEmpleado, anio, mes),
    enabled: !!idEmpleado && !!anio && !!mes,
    staleTime: FIVE_MINUTES,
  });
};
