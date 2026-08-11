import { useState } from 'react';
import { CheckCircle2, XCircle, X, AlertTriangle } from 'lucide-react';
import { useCambiarEstadoDetalle, useAprobarJustificacion } from '../../hooks/useVacaciones';
import { TIPO_VACACION_LABEL, TIPO_JUSTIFICACION_LABEL } from '../../lib/calendarioVacaciones';

// Modal de aprobacion/rechazo. Sirve para las dos fuentes de solicitudes:
//   solicitud.origen === 'vacacion'      -> POST /vacaciones/detalles/{id}/cambiar-estado
//   solicitud.origen === 'justificacion' -> POST /justificaciones/{id}/aprobar
//
// Los dos endpoints derivan el aprobador del JWT, asi que no se envia ningun
// id_aprobado_por. Si la cuenta autenticada no tiene empleado vinculado el
// backend responde 400 y el toast lo explica (ver mensajeDeError).
//
// El padre monta este modal solo cuando hay una solicitud activa y le pasa una
// `key` distinta por solicitud/accion, asi que la observacion y el checkbox se
// reinician solos al desmontar: no hace falta limpiarlos con un useEffect.

const AprobarSolicitudModal = ({ solicitud, accion, onClose }) => {
  const [observacion, setObservacion] = useState('');
  const [cubrirConSaldo, setCubrirConSaldo] = useState(false);

  const cambiarEstadoMutation = useCambiarEstadoDetalle();
  const aprobarJustificacionMutation = useAprobarJustificacion();

  if (!solicitud || !accion) return null;

  const esAprobacion = accion === 'aprobar';
  const esVacacion = solicitud.origen === 'vacacion';
  const esLicenciaAccidente = esVacacion && solicitud.tipo === 'licencia_accidente';

  const mutation = esVacacion ? cambiarEstadoMutation : aprobarJustificacionMutation;
  const enviando = mutation.isPending || mutation.isLoading;

  const tipoLegible = esVacacion
    ? TIPO_VACACION_LABEL[solicitud.tipo] || solicitud.tipo
    : TIPO_JUSTIFICACION_LABEL[solicitud.tipo] || solicitud.tipo;

  const handleSubmit = () => {
    const observacionLimpia = observacion.trim() || undefined;

    if (esVacacion) {
      cambiarEstadoMutation.mutate(
        {
          id: solicitud.id,
          payload: {
            nuevo_estado: esAprobacion ? 'aprobado' : 'rechazado',
            observacion: observacionLimpia,
            // Solo se manda en true si RRHH lo confirmo explicitamente
            ...(esLicenciaAccidente && esAprobacion
              ? { cubrir_con_saldo_vacacional: cubrirConSaldo }
              : {}),
          },
        },
        { onSuccess: onClose }
      );
      return;
    }

    aprobarJustificacionMutation.mutate(
      {
        id: solicitud.id,
        payload: {
          estado: esAprobacion ? 'aprobado' : 'rechazado',
          observacion: observacionLimpia,
        },
      },
      { onSuccess: onClose }
    );
  };

  const Icono = esAprobacion ? CheckCircle2 : XCircle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${
                esAprobacion ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-rose-700'
              }`}
            >
              <Icono className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-semibold text-slate-900">
              {esAprobacion ? 'Aprobar solicitud' : 'Rechazar solicitud'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{solicitud.empleadoNombre}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              <p>Tipo: {tipoLegible}</p>
              <p>
                Desde: {solicitud.fecha_inicio} · Hasta: {solicitud.fecha_fin}
              </p>
              {solicitud.horas != null && <p>Horas: {solicitud.horas}</p>}
              {solicitud.descripcion && <p>Detalle: {solicitud.descripcion}</p>}
            </div>
          </div>

          {esAprobacion && solicitud.tipo === 'viaje_trabajo' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Al aprobar se registrará la asistencia diaria del rango como{' '}
              <strong>viaje de trabajo</strong>. No es tiempo libre y no descuenta saldo
              vacacional.
            </div>
          )}

          {esAprobacion && esLicenciaAccidente && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-start gap-2 text-sm text-purple-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Licencia por accidente</p>
                  <p className="mt-1">
                    Por defecto esta licencia <strong>no consume</strong> saldo vacacional. Marca
                    la casilla solo si RRHH y el empleado acordaron cubrirla con su saldo.
                  </p>
                </div>
              </div>
              <label className="mt-3 flex items-center gap-3 text-sm text-purple-900">
                <input
                  type="checkbox"
                  checked={cubrirConSaldo}
                  onChange={(e) => setCubrirConSaldo(e.target.checked)}
                  className="h-4 w-4 rounded border-purple-300"
                />
                Cubrir con saldo vacacional
              </label>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-900">
              Observación {esAprobacion ? '(opcional)' : '(recomendada)'}
            </label>
            <textarea
              rows="3"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              maxLength={500}
              placeholder={
                esAprobacion
                  ? 'Ej: Aprobado según planificación del área'
                  : 'Ej: Fechas coinciden con cierre de planilla'
              }
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-[#03178C] focus:outline-none focus:ring-2 focus:ring-[#03178C]/20"
            />
            <p className="mt-2 text-xs text-slate-500">Máximo 500 caracteres</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={enviando}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              esAprobacion ? 'bg-[#376644] hover:bg-[#2f5639]' : 'bg-[#731B07] hover:bg-[#5d1606]'
            }`}
          >
            {enviando ? 'Guardando...' : esAprobacion ? 'Aprobar' : 'Rechazar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AprobarSolicitudModal;
