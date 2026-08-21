import { useMemo, useState } from 'react';
import { Info, LoaderCircle, Plus, ShieldAlert, Trash2, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';

import { formatFecha } from '../../lib/formatters';
import { estadoDeDecreto, PORCENTAJE_MAX, validarTramos } from '../../lib/tramosDecreto';
import {
  mensajeDeError,
  useActualizarDecreto,
  useAjustesDeDecreto,
  useCrearDecreto,
} from '../../hooks/useAjustesSalariales';

const ANIO_MIN = 2000;
const ANIO_MAX = 2100;
const REFERENCIA_MAX = 100;

const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

const tramoVacio = (orden) => ({
  orden,
  salario_desde: '',
  salario_hasta: '',
  porcentaje_incremento: '',
});

// Tramos del decreto en edición -> forma que usa el formulario (numeros a
// string para los <input>, null -> '' para desde/hasta sin límite).
const tramosDesdeDecreto = (decreto) =>
  (decreto?.condiciones || []).map((c) => ({
    orden: c.orden,
    salario_desde: c.salario_desde ?? '',
    salario_hasta: c.salario_hasta ?? '',
    porcentaje_incremento: c.porcentaje_incremento ?? '',
  }));

/**
 * Alta y edición de un decreto de incremento salarial, con sus tramos.
 *
 * `decreto` null = alta. El padre lo monta sólo cuando está abierto y con una
 * `key` distinta por decreto, así el estado se reinicia sin un useEffect que
 * llame a setState (react-hooks/set-state-in-effect).
 *
 * En edición, primero se consulta si el decreto ya generó ajustes
 * (useAjustesDeDecreto): si tiene alguno, el backend rechaza la edición
 * (services.actualizar_decreto) porque reemplazar los tramos borraría en
 * silencio el rastro de bajo qué tramo se calculó cada ajuste histórico. El
 * formulario se muestra en sólo lectura con el aviso en vez de dejar que el
 * usuario llene todo y recién entonces reciba el 400.
 */
const DecretoModal = ({ decreto = null, onCerrar, onGuardado }) => {
  const esEdicion = Boolean(decreto);

  const ajustesQuery = useAjustesDeDecreto(esEdicion ? decreto.id : null);
  const cantidadAjustes = ajustesQuery.data?.length ?? 0;
  const bloqueadoPorAjustes = esEdicion && !ajustesQuery.isLoading && cantidadAjustes > 0;

  const [anio, setAnio] = useState(decreto?.anio ? String(decreto.anio) : '');
  const [nuevoSmn, setNuevoSmn] = useState(decreto?.nuevo_smn ?? '');
  const [fechaVigencia, setFechaVigencia] = useState(decreto?.fecha_vigencia || hoyISO());
  const [referencia, setReferencia] = useState(decreto?.referencia_decreto || '');
  const [tramos, setTramos] = useState(
    esEdicion && decreto.condiciones?.length ? tramosDesdeDecreto(decreto) : [tramoVacio(1)]
  );

  const crearMutation = useCrearDecreto();
  const actualizarMutation = useActualizarDecreto();
  const mutacion = esEdicion ? actualizarMutation : crearMutation;

  const agregarTramo = () => {
    const siguienteOrden = tramos.length ? Math.max(...tramos.map((t) => t.orden)) + 1 : 1;
    setTramos([...tramos, tramoVacio(siguienteOrden)]);
  };

  const quitarTramo = (index) => setTramos(tramos.filter((_, i) => i !== index));

  const actualizarTramo = (index, campo, valor) =>
    setTramos(tramos.map((t, i) => (i === index ? { ...t, [campo]: valor } : t)));

  const anioNum = Number(anio);
  const erroresTramos = useMemo(() => validarTramos(tramos), [tramos]);

  const faltanCamposCabecera = !anio || !nuevoSmn || !fechaVigencia || !referencia.trim();
  const anioInvalido = anio !== '' && (!Number.isInteger(anioNum) || anioNum < ANIO_MIN || anioNum > ANIO_MAX);
  const smnInvalido = nuevoSmn !== '' && (!Number.isFinite(Number(nuevoSmn)) || Number(nuevoSmn) <= 0);

  const puedeEnviar =
    !bloqueadoPorAjustes &&
    !faltanCamposCabecera &&
    !anioInvalido &&
    !smnInvalido &&
    erroresTramos.length === 0 &&
    !mutacion.isPending;

  const esVigenciaFutura = fechaVigencia && estadoDeDecreto(fechaVigencia) === 'futuro';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;

    const payload = {
      anio: anioNum,
      nuevo_smn: Number(nuevoSmn),
      fecha_vigencia: fechaVigencia,
      referencia_decreto: referencia.trim(),
      condiciones: tramos.map((t) => ({
        orden: t.orden,
        salario_desde: t.salario_desde === '' ? null : Number(t.salario_desde),
        salario_hasta: t.salario_hasta === '' ? null : Number(t.salario_hasta),
        porcentaje_incremento: Number(t.porcentaje_incremento),
      })),
    };

    try {
      if (esEdicion) {
        await actualizarMutation.mutateAsync({ id: decreto.id, data: payload });
        toast.success(`Decreto ${payload.referencia_decreto} actualizado.`);
      } else {
        await crearMutation.mutateAsync(payload);
        toast.success(`Decreto ${payload.referencia_decreto} registrado.`);
      }
      onGuardado();
    } catch (error) {
      toast.error(
        mensajeDeError(error, esEdicion ? 'No se pudo actualizar el decreto.' : 'No se pudo crear el decreto.'),
        { duration: 6000 }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-7 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">
          {esEdicion ? `Editar decreto ${decreto.referencia_decreto}` : 'Nuevo decreto'}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {esEdicion
            ? 'Reemplaza la cabecera y los tramos completos del decreto.'
            : 'Un decreto establece el nuevo SMN y los tramos de incremento según el salario actual del empleado.'}
        </p>

        {esEdicion && ajustesQuery.isLoading && (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Comprobando si el decreto ya generó ajustes…
          </div>
        )}

        {bloqueadoPorAjustes && (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-[#FFFAEB] p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8A5A00]" />
              <div className="text-[13px] text-slate-600">
                <p className="font-semibold text-[#8A5A00]">
                  Este decreto ya generó {cantidadAjustes} ajuste{cantidadAjustes === 1 ? '' : 's'} salarial
                  {cantidadAjustes === 1 ? '' : 'es'} y no se puede editar.
                </p>
                <p className="mt-1">
                  Cambiar los tramos ahora borraría el rastro de bajo qué tramo se calculó cada
                  ajuste ya registrado. Si hace falta corregir algo, registrá un decreto nuevo —
                  usá el botón "Ver ajustes generados" desde el listado para revisar los datos
                  actuales primero.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCerrar}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {(!esEdicion || (!ajustesQuery.isLoading && !bloqueadoPorAjustes)) && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[#718096]">Año</span>
                <input
                  type="number"
                  min={ANIO_MIN}
                  max={ANIO_MAX}
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  autoFocus
                  placeholder="2026"
                  className="h-9 w-full rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]"
                />
                {anioInvalido && (
                  <span className="text-[11px] text-[#731B07]">
                    Debe estar entre {ANIO_MIN} y {ANIO_MAX}.
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[#718096]">Nuevo SMN (Bs.)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={nuevoSmn}
                  onChange={(e) => setNuevoSmn(e.target.value)}
                  placeholder="2500.00"
                  className="h-9 w-full rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]"
                />
                {smnInvalido && (
                  <span className="text-[11px] text-[#731B07]">Debe ser un monto mayor a 0.</span>
                )}
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-[#718096]">Referencia oficial</span>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                maxLength={REFERENCIA_MAX}
                placeholder="Ej. DS 4984"
                className="h-9 w-full rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-[#718096]">Fecha de vigencia</span>
              <input
                type="date"
                value={fechaVigencia}
                onChange={(e) => setFechaVigencia(e.target.value)}
                className="h-9 w-full rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]"
              />
            </label>

            {esVigenciaFutura && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-[#FFFAEB] p-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8A5A00]" />
                <p className="text-[13px] text-slate-600">
                  Fecha de vigencia futura ({formatFecha(fechaVigencia)}). Hoy no existe ningún
                  mecanismo automático que sincronice el salario de los empleados cuando llegue
                  esa fecha — el worker que debía hacerlo ya no existe. Este decreto queda
                  registrado igual, pero aplicarlo sigue fuera de esta pantalla (ver aviso arriba
                  del listado).
                </p>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#718096]">
                  Tramos por salario (orden de evaluación: se toma el primero que coincide)
                </span>
                <button
                  type="button"
                  onClick={agregarTramo}
                  className="flex items-center gap-1 text-[12px] font-semibold text-[#03178C] hover:opacity-70"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar tramo
                </button>
              </div>

              <div className="space-y-3">
                {tramos.map((tramo, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded-lg border border-[#E2E8F0] p-3"
                  >
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#718096]">Desde (Bs., vacío = sin límite)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tramo.salario_desde}
                        onChange={(e) => actualizarTramo(index, 'salario_desde', e.target.value)}
                        className="h-8 w-full rounded-[6px] border border-[#E2E8F0] px-2 text-[12px] text-[#1A202C] outline-none focus:border-[#03178C]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#718096]">Hasta (Bs., vacío = sin límite)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tramo.salario_hasta}
                        onChange={(e) => actualizarTramo(index, 'salario_hasta', e.target.value)}
                        className="h-8 w-full rounded-[6px] border border-[#E2E8F0] px-2 text-[12px] text-[#1A202C] outline-none focus:border-[#03178C]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#718096]">Incremento (%)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={PORCENTAJE_MAX}
                        value={tramo.porcentaje_incremento}
                        onChange={(e) => actualizarTramo(index, 'porcentaje_incremento', e.target.value)}
                        className="h-8 w-full rounded-[6px] border border-[#E2E8F0] px-2 text-[12px] text-[#1A202C] outline-none focus:border-[#03178C]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => quitarTramo(index)}
                      disabled={tramos.length === 1}
                      title={tramos.length === 1 ? 'El decreto necesita al menos un tramo' : 'Quitar tramo'}
                      className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#731B07] transition hover:bg-[#FFF5F5] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {erroresTramos.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {erroresTramos.map((err) => (
                    <li key={err} className="text-[11px] text-[#731B07]">
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-[#EBF4FF] p-3">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#03178C]" />
              <p className="text-[13px] text-slate-600">
                Al guardar, cada empleado con contrato indefinido activo va a evaluarse contra
                estos tramos en orden y va a recibir el porcentaje del primero que coincida con
                su salario actual — pero sólo cuando el decreto se aplique, algo que esta
                pantalla no ofrece todavía (ver el aviso del listado).
              </p>
            </div>

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
                {esEdicion ? 'Guardar cambios' : 'Crear decreto'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DecretoModal;
