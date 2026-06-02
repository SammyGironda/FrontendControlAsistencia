import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { getHorarios, getAsignacionHorario, crearAsignacion, finalizarAsignacion } from '../../api/horarios';

const diaLabel = (dia) => {
  const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return labels[dia - 1] || String(dia);
};

const Badge = ({ children, colorClass }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${colorClass}`}>
    {children}
  </span>
);

const AsignarHorarioDrawer = ({ empleado, isOpen, onClose, onAsignacionExitosa }) => {
  const [horarios, setHorarios] = useState([]);
  const [asignacionActual, setAsignacionActual] = useState(null);
  const [selectedHorarioId, setSelectedHorarioId] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [observacion, setObservacion] = useState('');
  const [finalizarActual, setFinalizarActual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedHorario = useMemo(
    () => horarios.find((item) => item.id === selectedHorarioId) || null,
    [horarios, selectedHorarioId]
  );

  const resetDrawerState = () => {
    setHorarios([]);
    setAsignacionActual(null);
    setSelectedHorarioId(null);
    setFechaInicio(format(new Date(), 'yyyy-MM-dd'));
    setObservacion('');
    setFinalizarActual(false);
    setIsLoading(false);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetDrawerState();
      return;
    }

    const fetchData = async () => {
      if (!empleado?.id) return;
      setIsLoading(true);

      try {
        const [horariosData, asignaciones] = await Promise.all([
          getHorarios({ activo: true }),
          getAsignacionHorario(empleado.id),
        ]);

        setHorarios(Array.isArray(horariosData) ? horariosData : []);

        const asignacion = Array.isArray(asignaciones) ? asignaciones[0] : null;
        setAsignacionActual(asignacion || null);
      } catch (error) {
        const msg = error.response?.data?.detail || error.message || 'Error al cargar datos de horarios';
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [empleado, isOpen]);

  const handleConfirm = async () => {
    if (!selectedHorarioId) return;

    setIsSubmitting(true);
    try {
      if (finalizarActual && asignacionActual?.id) {
        await finalizarAsignacion(asignacionActual.id, format(new Date(), 'yyyy-MM-dd'));
      }

      await crearAsignacion({
        id_empleado: empleado.id,
        id_horario: selectedHorarioId,
        fecha_inicio: fechaInicio,
        observacion: observacion.trim() || undefined,
      });

      toast.success(`Horario asignado correctamente a ${empleado.nombre}`);
      onClose();
      onAsignacionExitosa?.();
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Error al asignar horario';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="fixed inset-0 bg-black/40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-white shadow-2xl transition-transform duration-300">
        <div className="border-b border-gray-200 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Asignar Horario</h2>
            <p className="mt-1 text-sm text-primary">{empleado?.nombre} {empleado?.apellidos}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Horario Actual</h3>
            <div className="rounded-xl bg-slate-50 p-4">
              {isLoading ? (
                <div className="text-sm text-slate-500">Cargando horario actual...</div>
              ) : asignacionActual ? (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-primary">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-primary">{asignacionActual.horario?.nombre}</div>
                      <div className="text-sm text-slate-500">{asignacionActual.horario?.hora_entrada || '--'} — {asignacionActual.horario?.hora_salida || '--'}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Array.isArray(asignacionActual.horario?.dias_laborables) ? asignacionActual.horario.dias_laborables.map((dia) => (
                          <span key={dia} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] text-slate-700">{diaLabel(dia)}</span>
                        )) : null}
                      </div>
                      <div className="mt-2 text-[12px] text-slate-500">Desde {format(new Date(asignacionActual.fecha_inicio), 'dd/MM/yyyy')}</div>
                    </div>
                  </div>
                  <Badge colorClass="bg-emerald-100 text-emerald-700">Activo</Badge>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-orange-500">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-orange-600">Sin horario asignado</div>
                    <div className="mt-1 text-xs text-slate-500">Este empleado no tiene turno activo.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Asignar nuevo turno</h3>
            <div className="grid gap-2">
              {isLoading ? (
                <div className="text-sm text-slate-500">Cargando turnos disponibles...</div>
              ) : horarios.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50 p-5 text-sm text-slate-600">
                  No se encontraron turnos disponibles.
                </div>
              ) : (
                horarios.map((horario) => {
                  const isSelected = horario.id === selectedHorarioId;
                  return (
                    <button
                      key={horario.id}
                      type="button"
                      onClick={() => setSelectedHorarioId(horario.id)}
                      className={`w-full text-left rounded-2xl p-4 transition ${isSelected ? 'border-2 border-primary bg-blue-50' : 'border border-gray-200 bg-white hover:border-primary'} ${isSelected ? 'shadow-sm' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-slate-900">{horario.nombre}</div>
                          <div className="text-sm text-slate-500">{horario.hora_entrada || '--'} — {horario.hora_salida || '--'}</div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Array.isArray(horario.dias_laborables) ? horario.dias_laborables.map((dia) => (
                              <span key={dia} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">{diaLabel(dia)}</span>
                            )) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge colorClass={horario.tipo_jornada === 'continua' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                            {horario.tipo_jornada === 'continua' ? 'Continuo' : 'Discontinuo'}
                          </Badge>
                          <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${isSelected ? 'border-primary bg-primary' : 'border-slate-300 bg-white'}`}>
                            <span className={`${isSelected ? 'bg-white' : 'bg-transparent'} block h-2.5 w-2.5 rounded-full`} />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Fecha de inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Observación</label>
                <textarea
                  rows={2}
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Ej: Cambio por reorganización de turno"
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {asignacionActual ? (
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                  <label className="flex items-start gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={finalizarActual}
                      onChange={(e) => setFinalizarActual(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span>
                      <span className="font-medium">Finalizar el horario actual al asignar el nuevo</span>
                      <div className="mt-1 text-xs text-slate-500">
                        Si no lo marcas, el nuevo horario coexistirá con el actual hasta su fecha de inicio.
                      </div>
                    </span>
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs italic text-slate-500">* Los cambios se aplican de inmediato</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedHorarioId || isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    Procesando...
                  </span>
                ) : (
                  <>
                    <Check className="mr-2 h-3.5 w-3.5" />
                    Confirmar Asignación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AsignarHorarioDrawer;
