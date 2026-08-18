import { useQuery } from '@tanstack/react-query';

import { getIncidenciasPendientes } from '../api/marcaciones';

const UN_MINUTO = 60 * 1000;

// /marcaciones/incidencias/pendientes devuelve tres formas distintas segun el
// caso: array plano, { items } o { value }. La cascada vivia duplicada en
// Sidebar.jsx y en ResolucionIncidencias.jsx; aca queda una sola vez.
const normalizarIncidencias = (respuesta) => {
  if (Array.isArray(respuesta)) return respuesta;
  if (Array.isArray(respuesta?.items)) return respuesta.items;
  if (Array.isArray(respuesta?.value)) return respuesta.value;
  return [];
};

// Incidencias pendientes, para el badge del Sidebar.
//
// refetchInterval en vez de un setInterval a mano: React Query lo PAUSA cuando
// la pestana pierde el foco (refetchIntervalInBackground es false por defecto),
// asi que la app deja de pedir el conteo cada minuto mientras nadie la mira.
//
// staleTime igualado al intervalo, y no el global de 5 min de main.jsx: es lo
// que hace que al recuperar el foco el dato se considere vencido y se refresque
// sin esperar al siguiente tick.
export const useIncidenciasPendientes = () =>
  useQuery({
    queryKey: ['incidencias', 'pendientes'],
    queryFn: getIncidenciasPendientes,
    select: normalizarIncidencias,
    refetchInterval: UN_MINUTO,
    staleTime: UN_MINUTO,
  });
