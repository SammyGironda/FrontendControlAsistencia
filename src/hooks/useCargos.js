import { useQuery } from '@tanstack/react-query';
import { getCargos } from '../api/cargos';

const CINCO_MINUTOS = 5 * 60 * 1000;

/**
 * Catalogo COMPLETO de cargos, incluidos los desactivados.
 *
 * El `activo_only: false` es deliberado y es lo que distingue este hook de una
 * llamada suelta a getCargos(): el backend tiene ese parametro en TRUE por
 * defecto. Un empleado puede seguir asignado a un cargo que despues se
 * desactivo, y con la lista filtrada su id no encontraria match: la tabla
 * mostraria el numero crudo justo en la columna que existe para no mostrarlo.
 *
 * Es la misma leccion que dejo useEmpleadosParaCuenta vs useEmpleadosParaNombres
 * el 2026-08-18: resolver nombres necesita el padron completo, aunque ofrecer
 * opciones necesite el filtrado.
 *
 * Query key propia (`['cargos','catalogo']`) bajo el prefijo ['cargos'], para que
 * una invalidacion de cargos la alcance sin pisar la de otras pantallas.
 */
export const useCargosCatalogo = () =>
  useQuery({
    queryKey: ['cargos', 'catalogo'],
    queryFn: () => getCargos({ activo_only: false }),
    staleTime: CINCO_MINUTOS,
  });
