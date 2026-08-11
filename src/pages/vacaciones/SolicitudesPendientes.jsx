import { useMemo, useState } from 'react';
import { CalendarX, CheckCircle2, XCircle, Plane, Palmtree, FileText } from 'lucide-react';
import { useDetallesPendientes, useJustificacionesPendientes } from '../../hooks/useVacaciones';
import {
  TIPO_VACACION_LABEL,
  TIPO_JUSTIFICACION_LABEL,
  TIPO_DIA_CONFIG,
  nombreEmpleado,
} from '../../lib/calendarioVacaciones';
import AprobarSolicitudModal from './AprobarSolicitudModal';

// Panel de solicitudes a la espera de aprobacion. Unifica las dos fuentes:
//   - detalle_vacacion en estado 'solicitado'
//   - justificacion_ausencia en estado_aprobacion 'pendiente'
//
// vacacionPorId (Map<id_vacacion, id_empleado>) llega desde VacacionesPage
// porque DetalleVacacionResponse no incluye id_empleado.

const SkeletonBlock = ({ className = '' }) => (
  <div className={`rounded-[6px] bg-[#E2E8F0] animate-pulse ${className}`} />
);

const SolicitudesPendientes = ({ empleadosPorId, vacacionPorId }) => {
  const [solicitudActiva, setSolicitudActiva] = useState(null);
  const [accion, setAccion] = useState(null);

  const detallesQuery = useDetallesPendientes();
  const justificacionesQuery = useJustificacionesPendientes();

  const filas = useMemo(() => {
    const deVacaciones = (detallesQuery.data || []).map((detalle) => {
      const idEmpleado = vacacionPorId.get(detalle.id_vacacion) ?? null;
      return {
        key: `vacacion-${detalle.id}`,
        origen: 'vacacion',
        id: detalle.id,
        idEmpleado,
        empleadoNombre: idEmpleado
          ? nombreEmpleado(empleadosPorId.get(idEmpleado))
          : `Vacación #${detalle.id_vacacion}`,
        tipo: detalle.tipo_vacacion,
        tipoLegible: TIPO_VACACION_LABEL[detalle.tipo_vacacion] || detalle.tipo_vacacion,
        fecha_inicio: detalle.fecha_inicio,
        fecha_fin: detalle.fecha_fin,
        horas: detalle.horas_habiles,
        descripcion: detalle.observacion,
      };
    });

    const deJustificaciones = (justificacionesQuery.data || []).map((justificacion) => ({
      key: `justificacion-${justificacion.id}`,
      origen: 'justificacion',
      id: justificacion.id,
      idEmpleado: justificacion.id_empleado,
      empleadoNombre: nombreEmpleado(empleadosPorId.get(justificacion.id_empleado)),
      tipo: justificacion.tipo_justificacion,
      tipoLegible:
        TIPO_JUSTIFICACION_LABEL[justificacion.tipo_justificacion] ||
        justificacion.tipo_justificacion,
      fecha_inicio: justificacion.fecha_inicio,
      fecha_fin: justificacion.fecha_fin,
      horas: justificacion.total_horas_permiso,
      descripcion: justificacion.descripcion,
    }));

    return [...deVacaciones, ...deJustificaciones].sort((a, b) =>
      String(a.fecha_inicio).localeCompare(String(b.fecha_inicio))
    );
  }, [detallesQuery.data, justificacionesQuery.data, empleadosPorId, vacacionPorId]);

  const isLoading = detallesQuery.isLoading || justificacionesQuery.isLoading;
  const hasError = detallesQuery.isError || justificacionesQuery.isError;

  const abrirModal = (solicitud, tipoAccion) => {
    setSolicitudActiva(solicitud);
    setAccion(tipoAccion);
  };

  const cerrarModal = () => {
    setSolicitudActiva(null);
    setAccion(null);
  };

  const iconoDeFila = (fila) => {
    if (fila.tipo === 'viaje_trabajo') return Plane;
    if (fila.origen === 'vacacion') return Palmtree;
    return FileText;
  };

  const colorDeFila = (fila) => {
    if (fila.tipo === 'viaje_trabajo') return TIPO_DIA_CONFIG.viaje_trabajo;
    if (fila.tipo === 'goce_de_haber') return TIPO_DIA_CONFIG.vacacion_goce;
    if (fila.tipo === 'sin_goce_de_haber') return TIPO_DIA_CONFIG.vacacion_sin_goce;
    if (fila.tipo === 'licencia_accidente') return TIPO_DIA_CONFIG.licencia_accidente;
    return { bg: '#F7FAFC', text: '#4A5568' };
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-14" />
        <SkeletonBlock className="h-14" />
        <SkeletonBlock className="h-14" />
      </div>
    );
  }

  return (
    <>
      {hasError && (
        <div className="mb-4 rounded-[10px] border border-[#FEB2B2] bg-[#FFF5F5] p-4 text-[#731B07]">
          No se pudieron cargar las solicitudes pendientes. Verifica que el backend esté corriendo.
        </div>
      )}

      <div className="overflow-x-auto rounded-[12px] border border-[#E2E8F0] bg-white shadow-sm">
        {filas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <CalendarX className="h-8 w-8 text-[#CBD5E0]" />
            <p className="text-[14px] text-[#718096]">No hay solicitudes pendientes de aprobación</p>
          </div>
        ) : (
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                  Empleado
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                  Tipo
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                  Desde
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                  Hasta
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                  Horas
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => {
                const Icono = iconoDeFila(fila);
                const color = colorDeFila(fila);

                return (
                  <tr key={fila.key} className="border-b border-[#F7FAFC] last:border-0">
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-semibold text-[#1A202C]">
                        {fila.empleadoNombre}
                      </div>
                      {fila.descripcion && (
                        <div className="mt-0.5 max-w-[280px] truncate text-[12px] text-[#718096]">
                          {fila.descripcion}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ backgroundColor: color.bg, color: color.text }}
                      >
                        <Icono className="h-3.5 w-3.5" />
                        {fila.tipoLegible}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#4A5568]">{fila.fecha_inicio}</td>
                    <td className="px-4 py-3 text-[13px] text-[#4A5568]">{fila.fecha_fin}</td>
                    <td className="px-4 py-3 text-[13px] text-[#4A5568]">{fila.horas ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirModal(fila, 'aprobar')}
                          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#376644] px-3 py-1.5 text-[12px] font-semibold text-[#376644] hover:bg-[#F0FFF4]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirModal(fila, 'rechazar')}
                          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#731B07] px-3 py-1.5 text-[12px] font-semibold text-[#731B07] hover:bg-[#FFF5F5]"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {solicitudActiva && accion && (
        <AprobarSolicitudModal
          key={`${solicitudActiva.key}-${accion}`}
          solicitud={solicitudActiva}
          accion={accion}
          onClose={cerrarModal}
        />
      )}
    </>
  );
};

export default SolicitudesPendientes;
