import { useMemo, useState } from 'react';
import { X, Clock, AlertTriangle, Info, LoaderCircle, ArrowRight } from 'lucide-react';
import SelectField from '../../components/common/SelectField';
import { useSaldoGestion, useEmpleadosTodos, mensajeDeError } from '../../hooks/useVacaciones';
import { useCrearCompensacion } from '../../hooks/useCompensaciones';
import { nombreEmpleado } from '../../lib/calendarioVacaciones';
import { aNumero, formatearHoras } from '../../lib/formatters';

// Alta de una compensacion de horas extra (rrhh.compensacion_horas_extra).
//
// El padre monta este modal solo cuando esta abierto, asi que el estado se
// reinicia solo al desmontarlo: no hace falta un useEffect de limpieza (que
// ademas dispararia el error react-hooks/set-state-in-effect de ESLint).
//
// Tres cosas del backend condicionan el diseno:
//
// 1. LA OPERACION ES IRREVERSIBLE. El endpoint solo inserta la fila; el trigger
//    trg_compensacion_horas_extra_a_vacacion acredita las horas al saldo
//    vacacional en el acto. No hay PUT ni DELETE, y el trigger solo actua en
//    INSERT: deshacer una carga equivocada exige SQL a mano contra la base. De
//    ahi el panel de proyeccion y el checkbox de confirmacion.
// 2. El backend NO valida que la fecha sea fin de semana o feriado, ni que sea
//    pasada. Se confia en quien carga.
// 3. UNIQUE (id_empleado, fecha): una segunda carga para el mismo dia responde
//    409. La fila que choca puede haberla creado el sistema (Excel mensual o
//    viaje de trabajo aprobado), no una carga manual — el toast lo explica.

// El selector trae el padron completo, asi que se marca todo lo que no sea
// 'activo' para que quien carga la compensacion lo vea antes de elegir.
const ESTADO_EMPLEADO_LABEL = {
  baja: 'dado de baja',
  suspendido: 'suspendido',
  por_habilitar: 'por habilitar',
};

const Campo = ({ label, children, hint }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[11px] font-medium text-[#718096]">{label}</span>
    {children}
    {hint && <span className="text-[11px] text-[#A0AEC0]">{hint}</span>}
  </label>
);

const claseInput =
  'h-9 w-full rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]';

const NuevaCompensacionModal = ({ onClose }) => {
  const [idEmpleado, setIdEmpleado] = useState('');
  const [fecha, setFecha] = useState('');
  const [horas, setHoras] = useState('8');
  const [motivo, setMotivo] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  // Gestion derivada de la fecha, con override manual. Mientras gestionManual
  // sea null la gestion sigue a la fecha sola; en cuanto se elige otra, manda
  // esa. Sincronizarlo con un useEffect seria el error que ESLint bloquea.
  const [gestionManual, setGestionManual] = useState(null);
  const anioDeFecha = fecha ? Number(fecha.slice(0, 4)) : new Date().getFullYear();
  const gestion = gestionManual ?? anioDeFecha;

  const empleadosQuery = useEmpleadosTodos();
  const saldoQuery = useSaldoGestion(idEmpleado, gestion);
  const crearMutation = useCrearCompensacion();

  const empleados = useMemo(() => {
    const lista = empleadosQuery.data || [];
    return [...lista].sort((a, b) => nombreEmpleado(a).localeCompare(nombreEmpleado(b)));
  }, [empleadosQuery.data]);

  const empleadoElegido = useMemo(
    () => empleados.find((e) => String(e.id) === String(idEmpleado)) || null,
    [empleados, idEmpleado]
  );

  const horasNumero = aNumero(horas);

  const faltanCampos = !idEmpleado || !fecha || !motivo.trim();
  const horasInvalidas = !(horasNumero > 0); // gt=0 en el backend -> 422

  const puedeEnviar =
    !faltanCampos && !horasInvalidas && confirmado && !crearMutation.isPending;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!puedeEnviar) return;

    crearMutation.mutate(
      {
        id_empleado: Number(idEmpleado),
        fecha,
        horas: horasNumero,
        motivo: motivo.trim(),
        gestion,
      },
      { onSuccess: onClose }
    );
    // Ante error el modal queda abierto con los datos cargados: en el 409 solo
    // hay que corregir la fecha.
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FFFAF0] text-[#975A16]">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Registrar compensación</h2>
              <p className="text-[12px] text-[#718096]">
                Las horas se acreditan al saldo vacacional <strong>de inmediato</strong>
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Empleado"
              value={idEmpleado}
              onChange={(e) => setIdEmpleado(e.target.value)}
            >
              <option value="">
                {empleadosQuery.isLoading ? 'Cargando empleados...' : 'Selecciona un empleado'}
              </option>
              {empleados.map((empleado) => (
                <option key={empleado.id} value={empleado.id}>
                  {nombreEmpleado(empleado)}
                  {empleado.estado && empleado.estado !== 'activo'
                    ? ` — ${ESTADO_EMPLEADO_LABEL[empleado.estado] || empleado.estado}`
                    : ''}
                </option>
              ))}
            </SelectField>

            <Campo label="Fecha trabajada" hint="El día que trabajó fuera de su horario normal">
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={claseInput}
              />
            </Campo>

            <Campo label="Horas a acreditar" hint="8 h por defecto; editable para casos excepcionales">
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                className={claseInput}
              />
            </Campo>

            <SelectField
              label="Gestión"
              value={gestion}
              onChange={(e) => setGestionManual(Number(e.target.value))}
            >
              {[anioDeFecha - 1, anioDeFecha, anioDeFecha + 1].map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                  {anio === anioDeFecha ? ' — año de la fecha' : ''}
                </option>
              ))}
            </SelectField>
          </div>

          <Campo label="Motivo">
            <textarea
              rows="3"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
              placeholder="Ej: Trabajo en sábado por cierre de inventario"
              className="w-full rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]"
            />
          </Campo>

          {horasInvalidas && horas !== '' && (
            <Aviso tono="error">Las horas deben ser un número mayor a 0.</Aviso>
          )}

          <PanelProyeccion
            query={saldoQuery}
            saldo={saldoQuery.data}
            empleado={empleadoElegido}
            gestion={gestion}
            horas={horasNumero}
          />

          <Aviso tono="alerta">
            <p>
              <strong>Esta operación no se puede deshacer desde el sistema.</strong> Al registrarla,
              las horas se acreditan al saldo vacacional del empleado y no existe forma de anularlas
              ni editarlas desde la aplicación.
            </p>
          </Aviso>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#03178C]"
            />
            <span className="text-[13px] text-[#1A202C]">
              Confirmo los datos y entiendo que el registro es definitivo.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={crearMutation.isPending}
            className="rounded-[8px] border border-slate-300 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!puedeEnviar}
            className="inline-flex items-center gap-2 rounded-[8px] bg-[#03178C] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#021164] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {crearMutation.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {crearMutation.isPending ? 'Registrando...' : 'Registrar compensación'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------

const TONOS = {
  info: 'border-[#C7D2FE] bg-[#EBF4FF] text-[#03178C]',
  alerta: 'border-[#FBD38D] bg-[#FFFAF0] text-[#975A16]',
  error: 'border-[#FEB2B2] bg-[#FFF5F5] text-[#731B07]',
};

const Aviso = ({ tono = 'info', children }) => (
  <div className={`flex items-start gap-2 rounded-[10px] border p-3 text-[13px] ${TONOS[tono]}`}>
    {tono === 'info' ? (
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
    ) : (
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
    )}
    <div>{children}</div>
  </div>
);

const FilaProyeccion = ({ label, antes, despues }) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <span className="text-[12px] text-[#718096]">{label}</span>
    <span className="flex items-center gap-2 text-[13px]">
      <span className="text-[#718096]">{formatearHoras(antes)}</span>
      <ArrowRight className="h-3.5 w-3.5 text-[#A0AEC0]" />
      <span className="font-semibold text-[#376644]">{formatearHoras(despues)}</span>
    </span>
  </div>
);

// Que le va a pasar al saldo vacacional del empleado.
//
// La proyeccion replica el UPSERT del trigger: cuando la fila (empleado,
// gestion) YA existe, suma las horas a horas_correspondientes Y a
// horas_goce_haber. Cuando no existe, el trigger la crea con
// horas_correspondientes = base_LGT + horas y horas_goce_haber = horas — la base
// sale de fn_horas_vacacion_lgt dentro de la propia funcion del trigger, asi que
// el cliente no puede calcularla y no se inventa ningun numero.
const PanelProyeccion = ({ query, saldo, empleado, gestion, horas }) => {
  if (!empleado || !gestion) return null;

  if (query.isLoading) {
    return <div className="h-[92px] animate-pulse rounded-[10px] bg-[#E2E8F0]" />;
  }

  if (query.isError) {
    return (
      <Aviso tono="error">
        {mensajeDeError(query.error, 'No se pudo consultar el saldo del empleado.')}
      </Aviso>
    );
  }

  if (!saldo) {
    return (
      <Aviso tono="info">
        {nombreEmpleado(empleado)} todavía no tiene saldo para la gestión {gestion}. Al registrar,
        el sistema lo creará con las horas que le corresponden por antigüedad (LGT Art. 44) más
        estas {formatearHoras(horas)}.
      </Aviso>
    );
  }

  const correspondientes = aNumero(saldo.horas_correspondientes);
  const goceHaber = aNumero(saldo.horas_goce_haber);

  return (
    <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
        Saldo de {nombreEmpleado(empleado)} · gestión {gestion}
      </p>
      <div className="mt-2 divide-y divide-[#E2E8F0]">
        <FilaProyeccion
          label="Horas correspondientes"
          antes={correspondientes}
          despues={correspondientes + horas}
        />
        <FilaProyeccion
          label="Con goce de haber"
          antes={goceHaber}
          despues={goceHaber + horas}
        />
      </div>
      <p className="mt-2.5 text-[11px] text-[#A0AEC0]">
        Las horas se suman a los dos totales, que es lo que hace el trigger de la base.
      </p>
    </div>
  );
};

export default NuevaCompensacionModal;
