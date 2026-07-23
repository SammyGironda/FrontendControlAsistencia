import { useQuery } from '@tanstack/react-query';
import { X, FileText } from 'lucide-react';
import { getContrato } from '../../api/contratos';
import { getEmpleado } from '../../api/empleados';
import { formatFecha, formatMoneda } from '../../lib/formatters';

const stateStyles = {
  activo: { border: 'border-success', badge: 'bg-emerald-100 text-emerald-700' },
  vencido: { border: 'border-danger', badge: 'bg-red-100 text-danger' },
  rescindido: { border: 'border-gray-200', badge: 'bg-slate-100 text-slate-600' },
  finalizado: { border: 'border-primary', badge: 'bg-blue-100 text-primary' },
};

const DetalleContratoModal = ({ contratoId, isOpen, onClose }) => {
  const contratoQuery = useQuery({
    queryKey: ['contrato', contratoId],
    queryFn: () => getContrato(contratoId),
    enabled: isOpen && !!contratoId,
  });

  const empleadoQuery = useQuery({
    queryKey: ['empleado', contratoQuery.data?.id_empleado],
    queryFn: () => getEmpleado(contratoQuery.data.id_empleado),
    enabled: !!contratoQuery.data?.id_empleado,
  });

  const contrato = contratoQuery.data;
  const empleado = empleadoQuery.data;
  const estado = contrato?.estado || 'activo';
  const styles = stateStyles[estado] || stateStyles.activo;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto my-4 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Detalle del Contrato</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {contratoQuery.isLoading ? (
            <div className="space-y-3">
              <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-full rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
            </div>
          ) : contratoQuery.error ? (
            <div className="rounded-2xl bg-rose-50 p-5 text-sm text-rose-700">No se pudo cargar el detalle del contrato.</div>
          ) : (
            <>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-semibold">
                    {(empleado?.nombres || 'E')[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{empleado ? `${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim() : 'Empleado'}</p>
                    <p className="text-sm text-slate-500">CI {empleado?.ci_numero || contrato?.id_empleado || '--'}</p>
                    <p className="text-sm text-slate-500">{empleado?.cargo || `Departamento ${empleado?.id_departamento || '--'}`}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Tipo de contrato</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{contrato.tipo_contrato === 'indefinido' ? 'Indefinido' : 'Plazo Fijo'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Salario base</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoneda(Number(contrato.salario_base))}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Fecha inicio</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{formatFecha(contrato.fecha_inicio)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Fecha fin</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{contrato.fecha_fin ? formatFecha(contrato.fecha_fin) : 'Indefinido'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Estado</p>
                  <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}> {contrato.estado}</span>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Días restantes</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {contrato.fecha_fin
                      ? `${Math.ceil((new Date(contrato.fecha_fin) - new Date()) / 86400000)} días`
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Creado el</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatFecha(contrato.created_at)}</p>
              </div>

              {contrato.observacion && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Observación</p>
                  <p className="mt-2 text-sm text-slate-700">{contrato.observacion}</p>
                </div>
              )}

              {Array.isArray(contrato.historial) && contrato.historial.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-900">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <p className="font-semibold">Historial</p>
                  </div>
                  <div className="space-y-3 border-l-2 border-slate-200 pl-4">
                    {contrato.historial.map((evento, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                          <span>{formatFecha(evento.fecha)}</span>
                        </div>
                        <p className="text-sm text-slate-700">{evento.descripcion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetalleContratoModal;
