import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { getCompensaciones, crearCompensacion } from '../api/compensaciones';
import { formatearHoras } from '../lib/formatters';
import { mensajeDeError } from './useVacaciones';

const FIVE_MINUTES = 1000 * 60 * 5;

// mensajeDeError se reutiliza de useVacaciones en vez de duplicarse: ya traduce
// los dos errores mas probables de este modulo — el 403 de rol insuficiente y el
// 400 de "tu usuario no esta vinculado a un empleado", que un admin sin
// id_empleado recibe DESPUES de pasar el guard de rol (get_actor_empleado_id se
// evalua dentro del handler, no como Depends).

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

// Historial de compensaciones. Ambos filtros son opcionales: pasar undefined
// para "todos"/"todas".
export const useCompensaciones = (idEmpleado, gestion) =>
  useQuery({
    queryKey: ['compensaciones', idEmpleado ?? 'todos', gestion ?? 'todas'],
    queryFn: () => getCompensaciones({ id_empleado: idEmpleado, gestion, limit: 500 }),
    staleTime: FIVE_MINUTES,
  });

// ---------------------------------------------------------------------------
// Alta
// ---------------------------------------------------------------------------

// payload: { id_empleado, fecha, horas, motivo, gestion }
export const useCrearCompensacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => crearCompensacion(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['compensaciones'] });
      // Imprescindible: el trigger acaba de mover el saldo vacacional del
      // empleado, y la pantalla de Vacaciones lo muestra desde esta cache.
      queryClient.invalidateQueries({ queryKey: ['vacaciones'] });

      toast.success(
        `Se acreditaron ${formatearHoras(data.horas)} al saldo con goce de haber ` +
          `de la gestión ${data.gestion}.`
      );
    },
    onError: (error) => {
      const base = mensajeDeError(error, 'No se pudo registrar la compensación');

      // El 409 del UNIQUE (id_empleado, fecha) es el error mas probable, y su
      // mensaje no alcanza: la fila que choca puede haberla creado el propio
      // sistema, no una carga manual anterior. La generan el procesamiento del
      // Excel mensual (feriado trabajado) y la aprobacion de un viaje_trabajo
      // que cae en descanso o feriado.
      if (error?.response?.status === 409) {
        toast.error(
          `${base} Puede haberla generado el sistema al procesar el Excel ` +
            `(feriado trabajado) o al aprobar un viaje de trabajo.`
        );
        return;
      }

      toast.error(base);
    },
  });
};
