import { useMemo, useState } from 'react';
import {
  CalendarDays,
  ListChecks,
  CalendarX,
  AlertCircle,
  Palmtree,
  Plane,
  Sun,
} from 'lucide-react';
import { useEmpleados } from '../../hooks/useAsistencia';
import {
  useVacacionesTodas,
  useDetallesMes,
  useViajesTrabajoMes,
  useFeriadosActivos,
} from '../../hooks/useVacaciones';
import MonthGrid from '../../components/common/MonthGrid';
import SelectField from '../../components/common/SelectField';
import {
  TIPO_DIA_CONFIG,
  construirMapaDias,
  estiloDelDia,
  nombreEmpleado,
} from '../../lib/calendarioVacaciones';
import SolicitudesPendientes from './SolicitudesPendientes';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const ANIOS = ['2024', '2025', '2026'];

// Orden de la leyenda: primero las vacaciones, luego viaje y feriados
const ORDEN_LEYENDA = [
  'vacacion_goce',
  'vacacion_sin_goce',
  'licencia_accidente',
  'viaje_trabajo',
  'feriado_nacional',
  'feriado_departamental',
];

const SummaryCard = ({ icon: Icon, label, value, accentColor }) => (
  <div className="flex min-w-[190px] flex-1 items-center gap-4 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8FAFC]">
      <Icon className="h-5 w-5" style={{ color: accentColor }} />
    </div>
    <div>
      <div className="text-[24px] font-semibold text-[#1A202C]">{value}</div>
      <p className="text-[12px] text-[#718096]">{label}</p>
    </div>
  </div>
);

const SkeletonBlock = ({ className = '' }) => (
  <div className={`rounded-[6px] bg-[#E2E8F0] animate-pulse ${className}`} />
);

const VacacionesPage = () => {
  const [vistaActual, setVistaActual] = useState('calendario');
  const [mesSeleccionado, setMesSeleccionado] = useState(String(new Date().getMonth() + 1));
  const [anioSeleccionado, setAnioSeleccionado] = useState(String(new Date().getFullYear()));
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('all');

  const selectedEmpleadoId = empleadoSeleccionado === 'all' ? null : Number(empleadoSeleccionado);

  const empleadosQuery = useEmpleados();
  const vacacionesQuery = useVacacionesTodas();
  const detallesQuery = useDetallesMes(anioSeleccionado, mesSeleccionado, selectedEmpleadoId);
  const viajesQuery = useViajesTrabajoMes(anioSeleccionado, mesSeleccionado, selectedEmpleadoId);
  const feriadosQuery = useFeriadosActivos();

  const empleados = useMemo(() => empleadosQuery.data || [], [empleadosQuery.data]);

  const empleadosPorId = useMemo(() => {
    const mapa = new Map();
    empleados.forEach((empleado) => mapa.set(empleado.id, empleado));
    return mapa;
  }, [empleados]);

  // DetalleVacacionResponse solo trae id_vacacion, no id_empleado: este mapa
  // es lo que permite atribuir cada solicitud a su empleado.
  const vacacionPorId = useMemo(() => {
    const mapa = new Map();
    (vacacionesQuery.data || []).forEach((vacacion) => {
      mapa.set(vacacion.id, vacacion.id_empleado);
    });
    return mapa;
  }, [vacacionesQuery.data]);

  const mapaDias = useMemo(
    () =>
      construirMapaDias({
        detalles: detallesQuery.data || [],
        viajes: viajesQuery.data || [],
        feriados: feriadosQuery.data || [],
        vacacionPorId,
        anio: anioSeleccionado,
        mes: mesSeleccionado,
      }),
    [
      detallesQuery.data,
      viajesQuery.data,
      feriadosQuery.data,
      vacacionPorId,
      anioSeleccionado,
      mesSeleccionado,
    ]
  );

  // Totales del mes visible. Los feriados se cuentan por dia (no por empleado);
  // el resto cuenta dias-empleado.
  const resumen = useMemo(() => {
    let goce = 0;
    let sinGoce = 0;
    let viaje = 0;
    const diasFeriado = new Set();

    mapaDias.forEach((entrada, clave) => {
      entrada.items.forEach((item) => {
        if (item.tipo === 'vacacion_goce') goce += 1;
        else if (item.tipo === 'vacacion_sin_goce') sinGoce += 1;
        else if (item.tipo === 'viaje_trabajo') viaje += 1;
        else if (item.tipo.startsWith('feriado')) diasFeriado.add(clave);
      });
    });

    return { goce, sinGoce, viaje, feriados: diasFeriado.size };
  }, [mapaDias]);

  const isLoading =
    empleadosQuery.isLoading ||
    vacacionesQuery.isLoading ||
    detallesQuery.isLoading ||
    viajesQuery.isLoading ||
    feriadosQuery.isLoading;

  const hasError =
    empleadosQuery.isError ||
    vacacionesQuery.isError ||
    detallesQuery.isError ||
    viajesQuery.isError ||
    feriadosQuery.isError;

  const monthLabel = MONTHS[Number(mesSeleccionado) - 1] || 'Mes';

  const renderEmptyState = () => (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <CalendarX className="h-8 w-8 text-[#CBD5E0]" />
      <p className="text-[14px] text-[#718096]">Sin registros para el período seleccionado</p>
    </div>
  );

  // Contenido de cada celda del calendario.
  // Con un empleado seleccionado se muestra la etiqueta del tipo; en modo
  // "todos" se agrupa por tipo y se muestra el conteo de empleados.
  const renderDia = (date, dayKey) => {
    const entrada = mapaDias.get(dayKey);
    if (!entrada) return null;

    if (selectedEmpleadoId) {
      return entrada.items.map((item, index) => (
        <span
          key={`${item.tipo}-${index}`}
          className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: item.config.bg, color: item.config.text }}
          title={`${item.config.label}${item.detalle?.observacion ? ` — ${item.detalle.observacion}` : ''}`}
        >
          {item.etiqueta}
        </span>
      ));
    }

    const porTipo = new Map();
    entrada.items.forEach((item) => {
      const actual = porTipo.get(item.tipo) || { item, empleados: new Set(), etiqueta: item.etiqueta };
      if (item.idEmpleado) actual.empleados.add(item.idEmpleado);
      porTipo.set(item.tipo, actual);
    });

    return Array.from(porTipo.entries()).map(([tipo, agrupado]) => {
      const nombres = Array.from(agrupado.empleados)
        .map((id) => nombreEmpleado(empleadosPorId.get(id)))
        .join(', ');

      return (
        <span
          key={tipo}
          className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: agrupado.item.config.bg, color: agrupado.item.config.text }}
          title={nombres ? `${agrupado.item.config.label}: ${nombres}` : agrupado.item.config.label}
        >
          {agrupado.empleados.size > 0
            ? `${agrupado.etiqueta} · ${agrupado.empleados.size}`
            : agrupado.etiqueta}
        </span>
      );
    });
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1A202C]">Vacaciones y Ausencias</h1>
          <p className="mt-1 text-[13px] text-[#718096]">
            {monthLabel} {anioSeleccionado} ·{' '}
            {selectedEmpleadoId
              ? nombreEmpleado(empleadosPorId.get(selectedEmpleadoId))
              : 'Todos los empleados'}
          </p>
        </div>

        <div className="flex overflow-hidden rounded-[8px] border border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setVistaActual('calendario')}
            className={`inline-flex h-10 items-center gap-2 px-4 text-[13px] font-semibold transition ${
              vistaActual === 'calendario'
                ? 'bg-[#EBF4FF] text-[#03178C]'
                : 'bg-white text-[#94a3b8] hover:bg-[#F8FAFC]'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Calendario
          </button>
          <button
            type="button"
            onClick={() => setVistaActual('pendientes')}
            className={`inline-flex h-10 items-center gap-2 border-l border-[#E2E8F0] px-4 text-[13px] font-semibold transition ${
              vistaActual === 'pendientes'
                ? 'bg-[#EBF4FF] text-[#03178C]'
                : 'bg-white text-[#94a3b8] hover:bg-[#F8FAFC]'
            }`}
          >
            <ListChecks className="h-4 w-4" />
            Pendientes
          </button>
        </div>
      </div>

      {vistaActual === 'calendario' && (
        <div className="rounded-[8px] border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Mes"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            >
              {MONTHS.map((label, index) => (
                <option key={label} value={String(index + 1)}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Año"
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(e.target.value)}
            >
              {ANIOS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Empleado"
              value={empleadoSeleccionado}
              onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
            >
              <option value="all">Todos</option>
              {empleados
                .slice()
                .sort((a, b) => nombreEmpleado(a).localeCompare(nombreEmpleado(b)))
                .map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {nombreEmpleado(empleado)}
                  </option>
                ))}
            </SelectField>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#F7FAFC] pt-4 text-[12px] text-[#718096]">
            {ORDEN_LEYENDA.map((clave) => {
              const config = TIPO_DIA_CONFIG[clave];
              return (
                <div
                  key={clave}
                  className="flex items-center gap-2 rounded-[6px] px-2.5 py-1"
                  style={{ backgroundColor: config.bg, color: config.text }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{
                      backgroundColor: config.bg,
                      border: `1px ${config.borderStyle} ${config.border}`,
                    }}
                  />
                  {config.label}
                </div>
              );
            })}
            <span className="text-[11px] italic text-[#9A3412]">
              El viaje de trabajo no cuenta como tiempo libre: el empleado está trabajando fuera de
              la oficina.
            </span>
          </div>
        </div>
      )}

      {hasError && (
        <div className="rounded-[10px] border border-[#FEB2B2] bg-[#FFF5F5] p-4 text-[#731B07]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            No se pudo conectar con el servidor. Verifica que el backend esté corriendo en
            localhost:8000
          </div>
        </div>
      )}

      {vistaActual === 'pendientes' ? (
        <SolicitudesPendientes empleadosPorId={empleadosPorId} vacacionPorId={vacacionPorId} />
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
          <SkeletonBlock className="h-[420px]" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              icon={Palmtree}
              label="Días de vacación c/goce"
              value={resumen.goce}
              accentColor={TIPO_DIA_CONFIG.vacacion_goce.text}
            />
            <SummaryCard
              icon={Palmtree}
              label="Días de vacación s/goce"
              value={resumen.sinGoce}
              accentColor={TIPO_DIA_CONFIG.vacacion_sin_goce.text}
            />
            <SummaryCard
              icon={Plane}
              label="Días de viaje de trabajo"
              value={resumen.viaje}
              accentColor={TIPO_DIA_CONFIG.viaje_trabajo.text}
            />
            <SummaryCard
              icon={Sun}
              label="Feriados en el mes"
              value={resumen.feriados}
              accentColor={TIPO_DIA_CONFIG.feriado_nacional.text}
            />
          </div>

          <MonthGrid
            anio={anioSeleccionado}
            mes={mesSeleccionado}
            emptyState={renderEmptyState()}
            renderDia={renderDia}
            getEstiloCelda={(date, dayKey) => estiloDelDia(mapaDias.get(dayKey))}
          />
        </div>
      )}
    </div>
  );
};

export default VacacionesPage;
