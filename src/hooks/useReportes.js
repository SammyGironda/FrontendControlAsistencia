import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/reportes';
import { toast } from 'react-hot-toast';

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const useReportes = (params = {}) => {
  return useQuery({
    queryKey: ['reportes', params],
    queryFn: () => api.listarReportes(params),
    staleTime: 60 * 1000,
  });
};

export const useGenerarReporte = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tipo, payload = {}, idEmpleado, filename }) => {
      let created;

      if (tipo === 'planilla') {
        created = await api.generarPlanilla(payload);
      } else if (tipo === 'asistencia-mensual') {
        created = await api.generarAsistenciaMensual(payload);
      } else if (tipo === 'vacaciones') {
        created = await api.generarVacaciones(payload);
      } else if (tipo === 'individual') {
        created = await api.generarIndividual(idEmpleado, payload);
      } else {
        throw new Error('Tipo de reporte desconocido');
      }

      const id = created?.id;
      if (!id) return { created };

      const blob = await api.descargarReporte(id);
      const finalName = filename || `${tipo}-${id}`;
      downloadBlob(blob, finalName);

      queryClient.invalidateQueries({ queryKey: ['reportes'] });

      return { created, id };
    },
    onSuccess: () => {
      toast.success('Reporte generado y descargado exitosamente');
    },
    onError: (error) => {
      const msg = error?.response?.data?.detail || error?.message || 'Error al generar el reporte.';
      toast.error(msg);
    },
  });
};

export const useEliminarReporte = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.eliminarReporte(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes'] });
      toast.success('Reporte eliminado');
    },
    onError: (error) => {
      const msg = error?.response?.data?.detail || error?.message || 'Error al eliminar el reporte.';
      toast.error(msg);
    },
  });
};

export default useReportes;
