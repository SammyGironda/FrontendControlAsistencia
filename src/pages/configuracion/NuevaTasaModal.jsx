import { useMemo, useState } from 'react';
import { ArrowRight, Info, LoaderCircle, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';

import SelectField from '../../components/common/SelectField';
import { formatFecha, formatearPorcentaje } from '../../lib/formatters';
import {
  fechaDeCierre, LABORAL, normalizarNombreConcepto, PATRONAL,
} from '../../lib/tasasImpuesto';
import { mensajeDeError, useCrearParametroImpuesto } from '../../hooks/useImpuestos';

// Valor centinela del <select> para "no es ninguno de los existentes".
const CONCEPTO_NUEVO = '__nuevo__';

// Tope real de la columna NUMERIC(5,2).
const PORCENTAJE_MAX = 999.99;
const DESCRIPCION_MAX = 1000;

const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

const NuevaTasaModal = ({ conceptos = [], tasas = [], onCerrar, onGuardado }) => {
  const [conceptoElegido, setConceptoElegido] = useState(conceptos[0]?.nombre || CONCEPTO_NUEVO);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [tipoAporte, setTipoAporte] = useState(LABORAL);
  const [porcentaje, setPorcentaje] = useState('');
  const [fechaInicio, setFechaInicio] = useState(hoyISO());
  const [descripcion, setDescripcion] = useState('');

  const mutacion = useCrearParametroImpuesto();

  const esConceptoNuevo = conceptoElegido === CONCEPTO_NUEVO;
  const nombreFinal = esConceptoNuevo
    ? normalizarNombreConcepto(nombreNuevo)
    : conceptoElegido;

  // La ultima tasa registrada del concepto: es la que el backend va a cerrar.
  const tasaAnterior = useMemo(() => {
    if (esConceptoNuevo || !nombreFinal) return null;
    return (Array.isArray(tasas) ? tasas : [])
      .filter((t) => t.nombre === nombreFinal)
      .sort((a, b) =>
        String(b.fecha_vigencia_inicio || '').localeCompare(String(a.fecha_vigencia_inicio || ''))
      )[0] || null;
  }, [tasas, nombreFinal, esConceptoNuevo]);

  // Al versionar un concepto existente el tipo se hereda: el backend rechaza
  // con 400 si no coincide, asi que ofrecerlo editable seria ofrecer un error.
  const tipoEfectivo = tasaAnterior ? tasaAnterior.tipo_aporte : tipoAporte;

  const porcentajeNum = Number(porcentaje);
  const cierrePrevista = tasaAnterior && tasaAnterior.fecha_vigencia_fin === null
    ? fechaDeCierre(fechaInicio)
    : null;

  // Bloqueos duros: solo los que producirian un 422 o un 400 ilegible. El resto
  // lo decide el backend y su detail llega por toast.
  const faltanCampos = !nombreFinal || porcentaje === '' || !fechaInicio;
  const porcentajeInvalido =
    porcentaje !== '' && (!Number.isFinite(porcentajeNum) || porcentajeNum < 0 || porcentajeNum > PORCENTAJE_MAX);
  // El backend responde 400 si la nueva empieza antes o el mismo dia que la que
  // reemplaza; avisarlo acá evita el viaje de ida y vuelta.
  const fechaNoPosterior = Boolean(
    tasaAnterior && fechaInicio && fechaInicio <= tasaAnterior.fecha_vigencia_inicio
  );

  const puedeEnviar = !faltanCampos && !porcentajeInvalido && !fechaNoPosterior && !mutacion.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;

    try {
      await mutacion.mutateAsync({
        nombre: nombreFinal,
        tipo_aporte: tipoEfectivo,
        porcentaje: porcentajeNum,
        fecha_vigencia_inicio: fechaInicio,
        fecha_vigencia_fin: null,
        descripcion: descripcion.trim() || null,
      });
      toast.success(
        tasaAnterior
          ? `Tasa de ${nombreFinal} actualizada. La anterior quedó cerrada.`
          : `Concepto ${nombreFinal} registrado.`
      );
      onGuardado();
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo registrar la tasa.'), { duration: 6000 });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-7 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">Registrar nueva tasa</h3>
        <p className="mt-1 text-sm text-slate-500">
          Las tasas no se editan: se registra una versión nueva y la anterior queda
          en el historial con su período de vigencia.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <SelectField
            label="Concepto"
            value={conceptoElegido}
            onChange={(e) => setConceptoElegido(e.target.value)}
          >
            {conceptos.map((c) => (
              <option key={c.nombre} value={c.nombre}>
                {c.nombre} ({c.tipo_aporte})
              </option>
            ))}
            <option value={CONCEPTO_NUEVO}>— Concepto nuevo —</option>
          </SelectField>

          {esConceptoNuevo && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-[#718096]">Nombre del concepto</span>
              <input
                type="text"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                autoFocus
                placeholder="Ej. Aporte Nacional Solidario"
                className="h-9 w-full rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]"
              />
              {/* Vista previa del valor normalizado: la vista SQL compara el
                  nombre case-sensitive, asi que un acento o una minuscula crean
                  un concepto que nunca entra a ningun calculo. */}
              <span className="text-[11px] text-[#718096]">
                Se guardará como{' '}
                <code className="rounded bg-slate-100 px-1 font-mono text-[#03178C]">
                  {nombreFinal || '—'}
                </code>
              </span>
            </label>
          )}

          {esConceptoNuevo ? (
            <SelectField
              label="Tipo de aporte"
              value={tipoAporte}
              onChange={(e) => setTipoAporte(e.target.value)}
            >
              <option value={LABORAL}>LABORAL — se descuenta al empleado</option>
              <option value={PATRONAL}>PATRONAL — lo paga la empresa</option>
            </SelectField>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-[#718096]">Tipo de aporte</span>
              <div className="flex h-9 items-center rounded-[8px] border border-[#E2E8F0] bg-slate-50 px-3 text-[13px] text-[#4A5568]">
                {tipoEfectivo}
              </div>
              <span className="text-[11px] text-[#718096]">
                Se hereda del concepto: un concepto no cambia de tipo de aporte.
              </span>
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-[#718096]">Porcentaje</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max={PORCENTAJE_MAX}
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              placeholder="Ej. 12.71"
              className="h-9 w-full rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]"
            />
            {porcentajeInvalido && (
              <span className="text-[11px] text-[#731B07]">
                El porcentaje debe estar entre 0 y {PORCENTAJE_MAX}.
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-[#718096]">Vigente desde</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="h-9 w-full rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]"
            />
            {fechaNoPosterior && (
              <span className="text-[11px] text-[#731B07]">
                Debe ser posterior al {formatFecha(tasaAnterior.fecha_vigencia_inicio)}, que es
                cuando empieza la tasa que reemplaza.
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-[#718096]">Descripción (opcional)</span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={DESCRIPCION_MAX}
              rows={3}
              placeholder="Norma que la respalda, alcance, salvedades…"
              className="w-full rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]"
            />
          </label>

          {/* El cierre de la tasa anterior se MUESTRA, no se esconde: es el
              efecto principal de este formulario y hay que verlo antes de
              confirmar. */}
          {cierrePrevista && !fechaNoPosterior && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-[#EBF4FF] p-3">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#03178C]" />
              <p className="text-[13px] text-slate-600">
                La tasa actual de <span className="font-mono font-semibold">{nombreFinal}</span>{' '}
                ({formatearPorcentaje(tasaAnterior.porcentaje)}, vigente desde{' '}
                {formatFecha(tasaAnterior.fecha_vigencia_inicio)}){' '}
                <span className="inline-flex items-center gap-1 font-semibold">
                  <ArrowRight className="h-3 w-3" />
                  se cerrará el {formatFecha(cierrePrevista)}
                </span>
                , el día anterior al inicio de la nueva.
              </p>
            </div>
          )}

          {esConceptoNuevo && nombreFinal && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-[#FFFAEB] p-3">
              <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8A5A00]" />
              <p className="text-[13px] text-slate-600">
                Un concepto nuevo <strong>no entra automáticamente</strong> en el cálculo de
                planilla: la vista de reportes sólo usa <code className="font-mono">RC_IVA</code> y{' '}
                <code className="font-mono">AFP_LABORAL</code>. Queda registrado y visible acá.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!puedeEnviar}
              className="flex items-center gap-2 rounded-lg bg-[#03178C] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutacion.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Registrar tasa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevaTasaModal;
