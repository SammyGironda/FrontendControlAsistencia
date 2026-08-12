import { useMemo, useState } from 'react';
import { X, CalendarPlus, AlertTriangle, Info, LoaderCircle } from 'lucide-react';
import SelectField from '../../components/common/SelectField';
import { useEmpleados } from '../../hooks/useAsistencia';
import {
  useCalculoHorasHabiles,
  useSaldoGestion,
  useCrearSolicitud,
  mensajeDeError,
} from '../../hooks/useVacaciones';
import { nombreEmpleado, TIPO_VACACION_LABEL } from '../../lib/calendarioVacaciones';

// Alta de una solicitud de vacaciones (detalle_vacacion en estado 'solicitado').
//
// El padre monta este modal solo cuando esta abierto, asi que el estado se
// reinicia solo al desmontarlo: no hace falta un useEffect de limpieza (que
// ademas dispararia el error react-hooks/set-state-in-effect de ESLint).
//
// Tres cosas del backend condicionan el diseno:
//
// 1. `horas_habiles` lo envia el cliente; el backend no lo deriva de las fechas.
//    Por eso se consulta /calcular-horas-habiles y se manda ese valor exacto.
// 2. Crear un detalle exige un `id_vacacion` y casi ningun empleado tiene su
//    registro de saldo, asi que al enviar se llama antes a /asegurar-gestion.
// 3. El saldo se valida en DOS momentos distintos y contra campos distintos:
//    al crear contra horas_pendientes, y al pasar a 'tomado' contra la bolsa del
//    tipo elegido. Por eso se muestran los dos numeros (ver PanelSaldo).

const TIPOS_DISPONIBLES = ['goce_de_haber', 'sin_goce_de_haber'];

const MOTIVO_LABEL = {
  descanso: 'Día de descanso',
  feriado: 'Feriado',
  sin_horario: 'Sin horario asignado',
};

// El backend devuelve los decimales como string ("40.0"); Number() los normaliza
// para poder compararlos y formatearlos.
const aNumero = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

const formatearHoras = (valor) => `${aNumero(valor).toFixed(1)} h`;

// 'YYYY-MM-DD' -> 'lun 17 ago'. Se parsean los componentes a mano porque
// new Date('2026-08-17') se interpreta como UTC y en Bolivia (UTC-4) cae el
// dia anterior.
const formatearFechaCorta = (iso) => {
  const [anio, mes, dia] = String(iso).split('-').map(Number);
  if (!anio || !mes || !dia) return iso;

  const fecha = new Date(anio, mes - 1, dia);
  return fecha.toLocaleDateString('es-BO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
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

const NuevaSolicitudModal = ({ onClose }) => {
  const [idEmpleado, setIdEmpleado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipoVacacion, setTipoVacacion] = useState('goce_de_haber');
  const [observacion, setObservacion] = useState('');

  // La gestion sale del ANIO DE fecha_inicio: un rango que cruza dic/ene cuelga
  // de la gestion donde empieza.
  const gestion = fechaInicio ? Number(fechaInicio.slice(0, 4)) : null;

  const empleadosQuery = useEmpleados();
  const calculoQuery = useCalculoHorasHabiles(idEmpleado, fechaInicio, fechaFin);
  const saldoQuery = useSaldoGestion(idEmpleado, gestion);
  const crearMutation = useCrearSolicitud();

  const empleados = useMemo(() => {
    const lista = empleadosQuery.data || [];
    return [...lista].sort((a, b) =>
      nombreEmpleado(a).localeCompare(nombreEmpleado(b))
    );
  }, [empleadosQuery.data]);

  const empleadoElegido = useMemo(
    () => empleados.find((e) => String(e.id) === String(idEmpleado)) || null,
    [empleados, idEmpleado]
  );

  const calculo = calculoQuery.data;
  const horasHabiles = calculo ? aNumero(calculo.horas_habiles) : null;
  const saldo = saldoQuery.data;

  // Los dos topes que valida el backend, en momentos distintos
  const horasPendientes = saldo ? aNumero(saldo.horas_pendientes) : null;
  const bolsaDelTipo = saldo
    ? aNumero(
        tipoVacacion === 'goce_de_haber'
          ? saldo.horas_goce_haber
          : saldo.horas_sin_goce_haber
      )
    : null;

  const excedePendientes =
    horasHabiles !== null && horasPendientes !== null && horasHabiles > horasPendientes;
  const excedeBolsa =
    horasHabiles !== null && bolsaDelTipo !== null && horasHabiles > bolsaDelTipo;

  // Solo se bloquea lo que el backend rechazaria con un error ilegible. Que la
  // solicitud exceda el saldo NO bloquea: se avisa y el backend decide.
  const rangoInvertido = Boolean(fechaInicio && fechaFin && fechaFin < fechaInicio);
  const sinDiasHabiles = horasHabiles !== null && horasHabiles <= 0;
  const faltanCampos = !idEmpleado || !fechaInicio || !fechaFin;

  const puedeEnviar =
    !faltanCampos &&
    !rangoInvertido &&
    !sinDiasHabiles &&
    !calculoQuery.isLoading &&
    !calculoQuery.isError &&
    horasHabiles !== null &&
    !crearMutation.isPending;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!puedeEnviar) return;

    crearMutation.mutate(
      {
        idEmpleado: Number(idEmpleado),
        gestion,
        detalle: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          // El valor exacto que devolvio el backend, sin recalcular en el cliente
          horas_habiles: calculo.horas_habiles,
          tipo_vacacion: tipoVacacion,
          ...(observacion.trim() ? { observacion: observacion.trim() } : {}),
        },
      },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E6FFFA] text-[#285E61]">
              <CalendarPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Nueva solicitud de vacaciones</h2>
              <p className="text-[12px] text-[#718096]">
                Queda en estado <strong>solicitado</strong> hasta que RRHH la apruebe
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
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Tipo de vacación"
              value={tipoVacacion}
              onChange={(e) => setTipoVacacion(e.target.value)}
            >
              {TIPOS_DISPONIBLES.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {TIPO_VACACION_LABEL[tipo]}
                </option>
              ))}
            </SelectField>

            <Campo label="Desde">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className={claseInput}
              />
            </Campo>

            <Campo
              label="Hasta"
              hint={gestion ? `Gestión ${gestion}, según la fecha de inicio` : undefined}
            >
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio || undefined}
                onChange={(e) => setFechaFin(e.target.value)}
                className={claseInput}
              />
            </Campo>
          </div>

          {rangoInvertido && (
            <Aviso tono="error">La fecha final debe ser posterior o igual a la inicial.</Aviso>
          )}

          <PanelCalculo query={calculoQuery} />

          <PanelSaldo
            query={saldoQuery}
            saldo={saldo}
            gestion={gestion}
            empleado={empleadoElegido}
            tipoVacacion={tipoVacacion}
            horasPendientes={horasPendientes}
            bolsaDelTipo={bolsaDelTipo}
          />

          {sinDiasHabiles && (
            <Aviso tono="error">
              El rango no contiene ningún día hábil para este empleado, así que no consume horas y
              no puede registrarse. Revisa las fechas o el horario asignado.
            </Aviso>
          )}

          {!sinDiasHabiles && (excedePendientes || excedeBolsa) && (
            <Aviso tono="alerta">
              {excedePendientes && (
                <p>
                  Supera el saldo disponible por{' '}
                  <strong>{formatearHoras(horasHabiles - horasPendientes)}</strong>. El backend
                  rechazará la solicitud al crearla.
                </p>
              )}
              {!excedePendientes && excedeBolsa && (
                <p>
                  Alcanza para crearla, pero supera la bolsa de{' '}
                  <strong>{TIPO_VACACION_LABEL[tipoVacacion].toLowerCase()}</strong> por{' '}
                  <strong>{formatearHoras(horasHabiles - bolsaDelTipo)}</strong>. Fallaría al
                  marcarla como tomada.
                </p>
              )}
              <p className="mt-1 text-[12px]">
                Puedes enviarla igual: la validación definitiva la hace el backend.
              </p>
            </Aviso>
          )}

          <Campo label="Observación (opcional)">
            <textarea
              rows="2"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              maxLength={500}
              placeholder="Ej: Vacación anual coordinada con el área"
              className="w-full rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]"
            />
          </Campo>
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
            {crearMutation.isPending ? 'Registrando...' : 'Registrar solicitud'}
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

// Cuánto consume la solicitud y qué días no cuentan.
const PanelCalculo = ({ query }) => {
  if (query.isLoading) {
    return <div className="h-[92px] animate-pulse rounded-[10px] bg-[#E2E8F0]" />;
  }

  if (query.isError) {
    return (
      <Aviso tono="error">
        {mensajeDeError(query.error, 'No se pudieron calcular las horas hábiles del rango.')}
      </Aviso>
    );
  }

  if (!query.data) return null;

  const { horas_habiles, dias_habiles, horas_por_jornada, horario_uniforme, dias_excluidos } =
    query.data;

  return (
    <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
        Esta solicitud consume
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[28px] font-semibold leading-none text-[#1A202C]">
          {formatearHoras(horas_habiles)}
        </span>
        <span className="text-[13px] text-[#4A5568]">
          {dias_habiles} {dias_habiles === 1 ? 'día hábil' : 'días hábiles'}
          {horario_uniforme && ` × ${formatearHoras(horas_por_jornada)} por jornada`}
        </span>
      </div>

      {!horario_uniforme && (
        <p className="mt-1.5 text-[12px] text-[#718096]">
          El horario del empleado cambia dentro del rango, así que las jornadas no son todas
          iguales.
        </p>
      )}

      {dias_excluidos.length > 0 && (
        <div className="mt-3 border-t border-[#E2E8F0] pt-3">
          <p className="text-[11px] font-medium text-[#718096]">
            No cuentan ({dias_excluidos.length}):
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {dias_excluidos.map((dia) => (
              <li key={dia.fecha} className="text-[12px] text-[#4A5568]">
                <span className="font-medium">{formatearFechaCorta(dia.fecha)}</span>{' '}
                <span className="text-[#718096]">
                  {dia.motivo === 'feriado' ? dia.etiqueta : MOTIVO_LABEL[dia.motivo] || dia.motivo}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Saldo del empleado. Se muestran los DOS topes porque el backend valida contra
// horas_pendientes al crear y contra la bolsa del tipo al pasar a 'tomado':
// enseñar solo uno haria que una solicitud "viable" fallara despues sin
// explicacion.
const PanelSaldo = ({
  query,
  saldo,
  gestion,
  empleado,
  tipoVacacion,
  horasPendientes,
  bolsaDelTipo,
}) => {
  if (!gestion || !empleado) return null;

  if (query.isLoading) {
    return <div className="h-[76px] animate-pulse rounded-[10px] bg-[#E2E8F0]" />;
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
        {nombreEmpleado(empleado)} todavía no tiene saldo registrado para la gestión {gestion}. Se
        creará automáticamente al enviar, con las horas que le corresponden por antigüedad (LGT
        Art. 44).
      </Aviso>
    );
  }

  return (
    <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
        Saldo de {nombreEmpleado(empleado)} · gestión {gestion}
      </p>
      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        <div>
          <p className="text-[12px] text-[#718096]">Disponible para solicitar</p>
          <p className="text-[15px] font-semibold text-[#1A202C]">
            {formatearHoras(horasPendientes)}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-[#718096]">
            Bolsa de {TIPO_VACACION_LABEL[tipoVacacion].toLowerCase()}
          </p>
          <p className="text-[15px] font-semibold text-[#1A202C]">{formatearHoras(bolsaDelTipo)}</p>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] text-[#A0AEC0]">
        El primero limita crear la solicitud; el segundo, marcarla como tomada.
      </p>
    </div>
  );
};

export default NuevaSolicitudModal;
