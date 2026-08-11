import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  LayoutList,
  CalendarDays,
  SlidersHorizontal,
  AlertCircle,
  CalendarX,
  FileSpreadsheet,
  Fingerprint,
  PenLine,
} from 'lucide-react';
import { useEmpleados, useAsistenciaEmpleado, useResumenMensual } from '../../hooks/useAsistencia';
import { getAsistenciaEmpleado } from '../../api/asistencia';
import MonthGrid from '../../components/common/MonthGrid';
import SelectField from '../../components/common/SelectField';

const colors = {
  primary: '#03178C',
  primaryLight: '#EBF4FF',
  success: '#376644',
  successLight: '#F0FFF4',
  danger: '#731B07',
  dangerLight: '#FFF5F5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  textDark: '#1A202C',
  textMid: '#4A5568',
  textLight: '#718096',
  textMuted: '#CBD5E0',
  border: '#E2E8F0',
  borderLight: '#F7FAFC',
  bg: '#F8FAFC',
  white: '#FFFFFF',
};

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

const rowBg = {
  presente: '#FFFFFF',
  presente_exento: '#F0FFF4',
  ausente: '#FFF5F5',
  feriado: '#EBF4FF',
  permiso_parcial: '#FFFBEB',
  licencia_medica: '#FAF5FF',
  descanso: '#F7FAFC',
};

const estadoConfig = {
  presente: { bg: '#F0FFF4', text: '#376644', label: 'Normal' },
  presente_exento: { bg: '#F0FFF4', text: '#376644', label: 'Exento' },
  feriado: { bg: '#EBF4FF', text: '#03178C', label: 'Feriado' },
  ausente: { bg: '#FFF5F5', text: '#731B07', label: 'Falta' },
  permiso_parcial: { bg: '#FFFBEB', text: '#D97706', label: 'Permiso' },
  licencia_medica: { bg: '#FAF5FF', text: '#6B46C1', label: 'Licencia' },
  descanso: { bg: '#F7FAFC', text: '#718096', label: 'Descanso' },
};

const origenConfig = {
  Excel: { bg: '#F0FFF4', text: '#376644', icon: FileSpreadsheet },
  API_Biometrico: { bg: '#EBF4FF', text: '#03178C', icon: Fingerprint },
  Manual: { bg: '#FFFBEB', text: '#D97706', icon: PenLine },
};

const getAreaLabel = (empleado) => {
  if (!empleado) return 'Sin área';
  if (empleado.departamento?.nombre) return empleado.departamento.nombre;
  if (empleado.departamento) return String(empleado.departamento);
  if (empleado.area) return empleado.area;
  if (empleado.id_departamento) return `Área ${empleado.id_departamento}`;
  return 'Sin área';
};

const normalizeAsistenciaRow = (row) => ({
  ...row,
  id: row.id ?? row.asistencia_id ?? row.asistenciaId,
  id_empleado: row.id_empleado ?? row.empleado_id ?? row.empleado?.id,
  nombres: row.nombres ?? row.empleado?.nombres ?? row.empleado_nombre ?? '',
  apellidos: row.apellidos ?? row.empleado?.apellidos ?? '',
  ci_numero: row.ci_numero ?? row.ci ?? row.empleado?.ci_numero ?? '—',
  fecha: row.fecha,
  tipo_dia: row.tipo_dia ?? row.tipoDia ?? row.estado ?? 'presente',
  minutos_retraso: row.minutos_retraso ?? row.minutosRetraso ?? 0,
  origen_dato: row.origen_dato ?? row.origen ?? 'Manual',
  observacion: row.observacion ?? row.comentario ?? row.observaciones ?? '—',
});

const SummaryCard = ({ icon: Icon, label, value, accentColor }) => (
  <div className="flex min-w-[190px] flex-1 items-center gap-4 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.primaryLight }}>
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

const AsistenciaPage = () => {
  const [vistaActual, setVistaActual] = useState('lista');
  const [mesSeleccionado, setMesSeleccionado] = useState(String(new Date().getMonth() + 1));
  const [anioSeleccionado, setAnioSeleccionado] = useState(String(new Date().getFullYear()));
  const [areaSeleccionada, setAreaSeleccionada] = useState('all');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('all');
  const [page, setPage] = useState(1);
  const [calendarTodosData, setCalendarTodosData] = useState([]);
  const [loadingCalendarTodos, setLoadingCalendarTodos] = useState(false);

  const empleadosQuery = useEmpleados();
  const empleados = empleadosQuery.data || [];
  const selectedEmpleadoId = empleadoSeleccionado === 'all' ? null : Number(empleadoSeleccionado);
  const asistenciaQuery = useAsistenciaEmpleado(selectedEmpleadoId);
  const resumenQuery = useResumenMensual(
    selectedEmpleadoId,
    anioSeleccionado,
    String(mesSeleccionado).padStart(2, '0')
  );

  const selectedEmpleado = useMemo(
    () => empleados.find((empleado) => String(empleado.id) === String(selectedEmpleadoId)),
    [empleados, selectedEmpleadoId]
  );

  const areaOptions = useMemo(() => {
    const labels = [];
    const seen = new Set();

    empleados.forEach((empleado) => {
      const label = getAreaLabel(empleado);
      if (!seen.has(label)) {
        labels.push(label);
        seen.add(label);
      }
    });

    return labels;
  }, [empleados]);

  const asistenciaRows = useMemo(() => {
    return (asistenciaQuery.data || []).map(normalizeAsistenciaRow);
  }, [asistenciaQuery.data]);

  const selectedEmployeeArea = useMemo(() => getAreaLabel(selectedEmpleado), [selectedEmpleado]);

  const filteredRows = useMemo(() => {
    if (!selectedEmpleadoId) return [];

    const monthString = String(mesSeleccionado).padStart(2, '0');
    const validArea = areaSeleccionada === 'all' || selectedEmployeeArea === areaSeleccionada;

    if (!validArea) return [];

    return asistenciaRows.filter((row) => {
      const fecha = row.fecha ? parseISO(row.fecha) : null;
      if (!fecha) return false;
      const rowMonth = String(format(fecha, 'MM'));
      const rowYear = String(format(fecha, 'yyyy'));
      return rowMonth === monthString && rowYear === anioSeleccionado;
    });
  }, [asistenciaRows, mesSeleccionado, anioSeleccionado, areaSeleccionada, selectedEmpleadoId, selectedEmployeeArea]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, safePage]);

  const selectedRowsByDate = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      if (row.fecha) {
        map.set(format(parseISO(row.fecha), 'yyyy-MM-dd'), row);
      }
    });
    return map;
  }, [filteredRows]);

  const shouldLoadTodosCalendar =
    vistaActual === 'calendario' && empleadoSeleccionado === 'all' && empleados.length > 0 && empleados.length < 20;

  const calendarCountsByDate = useMemo(() => {
    const map = new Map();
    calendarTodosData.forEach((item) => {
      item.records.forEach((record) => {
        const key = record.fecha ? record.fecha.slice(0, 10) : null;
        if (key) {
          map.set(key, (map.get(key) || 0) + 1);
        }
      });
    });
    return map;
  }, [calendarTodosData]);

  const calendarTodosCount = useMemo(() => {
    let total = 0;
    calendarCountsByDate.forEach((value) => {
      total += value;
    });
    return total;
  }, [calendarCountsByDate]);

  useEffect(() => {
    setPage(1);
  }, [vistaActual, mesSeleccionado, anioSeleccionado, areaSeleccionada, empleadoSeleccionado]);

  useEffect(() => {
    let active = true;
    if (!shouldLoadTodosCalendar) {
      setCalendarTodosData([]);
      setLoadingCalendarTodos(false);
      return;
    }

    const loadCalendarTodos = async () => {
      setLoadingCalendarTodos(true);
      try {
        const responses = await Promise.all(
          empleados.map(async (empleado) => {
            const records = await getAsistenciaEmpleado(empleado.id);
            return { empleadoId: empleado.id, records: records || [] };
          })
        );

        if (!active) return;
        setCalendarTodosData(responses);
      } catch (error) {
        if (!active) return;
        setCalendarTodosData([]);
      } finally {
        if (active) {
          setLoadingCalendarTodos(false);
        }
      }
    };

    loadCalendarTodos();

    return () => {
      active = false;
    };
  }, [shouldLoadTodosCalendar, empleados]);

  const isLoading =
    empleadosQuery.isLoading || asistenciaQuery.isLoading || resumenQuery.isLoading || loadingCalendarTodos;

  const hasError = empleadosQuery.isError || asistenciaQuery.isError || resumenQuery.isError;

  const registrosCount =
    vistaActual === 'calendario'
      ? empleadoSeleccionado === 'all'
        ? calendarTodosCount
        : filteredRows.length
      : filteredRows.length;

  const monthLabel = MONTHS[Number(mesSeleccionado) - 1] || 'Mes';

  const renderOrigenBadge = (origin) => {
    if (!origin) return <span className="text-[12px] text-[#94a3b8]">—</span>;
    const config = origenConfig[origin] || origenConfig.Manual;
    const Icon = config.icon;
    return (
      <span
        className="inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-[12px]"
        style={{ backgroundColor: config.bg, color: config.text }}
      >
        <Icon className="h-3.5 w-3.5" />
        {origin}
      </span>
    );
  };

  const renderEstadoBadge = (tipoDia) => {
    const config = estadoConfig[tipoDia] || {
      bg: '#EDF2F7',
      text: '#4A5568',
      label: tipoDia ? tipoDia.replace(/_/g, ' ') : 'Desconocido',
    };
    return (
      <span
        className="inline-flex rounded-[20px] px-3 py-1 text-[12px] font-medium"
        style={{ backgroundColor: config.bg, color: config.text }}
      >
        {config.label}
      </span>
    );
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-[#E2E8F0] bg-white p-12 text-center">
      <CalendarX className="h-12 w-12 text-[#CBD5E0]" />
      <p className="text-[14px] text-[#718096]">Sin registros para el período seleccionado</p>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-[22px] font-semibold" style={{ color: colors.textDark }}>
            Asistencia y Cálculos
          </h1>
          <p className="text-[14px] text-[#718096]">
            Registro detallado · {registrosCount} registros · {monthLabel} {anioSeleccionado}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[8px] border border-[#E2E8F0] bg-white px-4 py-2 text-[13px] font-semibold text-[#03178C]"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Tolerancia: 10 min
          </button>
          <div className="inline-flex overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-white">
            <button
              type="button"
              onClick={() => setVistaActual('lista')}
              className={`inline-flex h-10 w-10 items-center justify-center border-r border-[#E2E8F0] transition ${
                vistaActual === 'lista'
                  ? 'bg-[#EBF4FF] text-[#03178C]'
                  : 'bg-white text-[#94a3b8] hover:bg-[#F8FAFC]'
              }`}
            >
              <LayoutList className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setVistaActual('calendario')}
              className={`inline-flex h-10 w-10 items-center justify-center transition ${
                vistaActual === 'calendario'
                  ? 'bg-[#EBF4FF] text-[#03178C]'
                  : 'bg-white text-[#94a3b8] hover:bg-[#F8FAFC]'
              }`}
            >
              <CalendarDays className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[8px] border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField label="Mes" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)}>
              {MONTHS.map((label, index) => (
                <option key={label} value={String(index + 1)}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField label="Año" value={anioSeleccionado} onChange={(e) => setAnioSeleccionado(e.target.value)}>
              {['2024', '2025', '2026'].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </SelectField>
            <SelectField label="Área" value={areaSeleccionada} onChange={(e) => setAreaSeleccionada(e.target.value)}>
              <option value="all">Todas las Áreas</option>
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
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
                .sort((a, b) => {
                  const nameA = `${a.nombres || ''} ${a.apellidos || ''}`.trim().toLowerCase();
                  const nameB = `${b.nombres || ''} ${b.apellidos || ''}`.trim().toLowerCase();
                  return nameA.localeCompare(nameB);
                })
                .map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {`${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim() || `Empleado ${empleado.id}`}
                  </option>
                ))}
            </SelectField>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#718096]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#E2E8F0] bg-white" />
              Normal
            </div>
            <div className="flex items-center gap-2 bg-[#FFFBEB] px-2.5 py-1 rounded-[6px]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#FFFBEB] border border-[#FDE68A]" />
              Retraso
            </div>
            <div className="flex items-center gap-2 bg-[#FFF5F5] px-2.5 py-1 rounded-[6px]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#FFF5F5] border border-[#FECACA]" />
              Falta
            </div>
            <div className="flex items-center gap-2 bg-[#EBF4FF] px-2.5 py-1 rounded-[6px]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#EBF4FF] border border-[#C7D2FE]" />
              Feriado/Exento
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard icon={Fingerprint} label="Días Presentes" value={selectedEmpleadoId ? resumenQuery.data?.dias_presente ?? '—' : '—'} accentColor={colors.success} />
        <SummaryCard icon={AlertCircle} label="Ausencias" value={selectedEmpleadoId ? resumenQuery.data?.dias_ausente ?? '—' : '—'} accentColor={colors.danger} />
        <SummaryCard icon={CalendarDays} label="Min. Retraso Total" value={selectedEmpleadoId ? resumenQuery.data?.total_minutos_retraso ?? '—' : '—'} accentColor={colors.warning} />
        <SummaryCard
          icon={LayoutList}
          label="Feriados/Exentos"
          value={
            selectedEmpleadoId
              ? (Number(resumenQuery.data?.dias_feriado || 0) + Number(resumenQuery.data?.dias_presente_exento || 0)) || 0
              : '—'
          }
          accentColor={colors.primary}
        />
      </div>

      {hasError && (
        <div className="rounded-[10px] border border-[#FEB2B2] bg-[#FFF5F5] p-4 text-[#731B07]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            No se pudo conectar con el servidor. Verifica que el backend esté corriendo en localhost:8000
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
          <SkeletonBlock className="h-[420px]" />
        </div>
      ) : vistaActual === 'lista' ? (
        <div className="rounded-[12px] border border-[#E2E8F0] bg-white shadow-sm overflow-x-auto">
          {paginatedRows.length === 0 ? (
            renderEmptyState()
          ) : (
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  {['EMPLEADO', 'CI', 'FECHA', 'H. ENTRADA', 'H. SALIDA', 'MIN. RETRASO', 'ESTADO', 'ORIGEN', 'OBSERVACIÓN'].map((title) => (
                    <th
                      key={title}
                      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#718096]"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => {
                  const rowDate = row.fecha ? parseISO(row.fecha) : null;
                  const rowKey = String(row.id);
                  const bgColor = rowBg[row.tipo_dia] || '#FFFFFF';
                  const retraso = Number(row.minutos_retraso || 0);
                  const entradaStyle = retraso > 0 ? { color: colors.warning, fontWeight: 700 } : {};
                  return (
                    <tr key={rowKey} style={{ backgroundColor: bgColor }} className="border-b border-[#F7FAFC]">
                      <td className="px-4 py-3 text-[14px] font-medium text-[#1A202C]">
                        {selectedEmpleado ? `${selectedEmpleado.nombres || ''} ${selectedEmpleado.apellidos || ''}`.trim() : '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#718096]">{selectedEmpleado?.ci_numero ?? selectedEmpleado?.ci ?? '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-[#4A5568]">
                        {rowDate ? format(rowDate, 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px]" style={entradaStyle}>
                        {'—'}
                        {/* TODO: expandir endpoint para incluir hora_entrada y hora_salida */}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#94A3B8]">—</td>
                      <td className="px-4 py-3 text-[13px]">
                        {retraso > 0 ? (
                          <span className="font-semibold" style={{ color: colors.warning }}>
                            {retraso}
                          </span>
                        ) : (
                          <span className="text-[#CBD5E0]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{renderEstadoBadge(row.tipo_dia)}</td>
                      <td className="px-4 py-3">{renderOrigenBadge(row.origen_dato)}</td>
                      <td className="px-4 py-3 text-[13px] italic text-[#718096]">{row.observacion || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {paginatedRows.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#F7FAFC] px-4 py-3 md:flex-row">
              <div className="text-[13px] text-[#718096]">
                Página {safePage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#03178C] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={safePage === 1}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#03178C] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={safePage === totalPages}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {empleadoSeleccionado === 'all' && empleados.length >= 20 ? (
            <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-10 text-center text-[14px] text-[#718096]">
              Selecciona un empleado para ver el calendario detallado
            </div>
          ) : (
            <MonthGrid
              anio={anioSeleccionado}
              mes={mesSeleccionado}
              emptyState={renderEmptyState()}
              getEstiloCelda={(date, dayKey) => {
                const record = selectedEmpleadoId ? selectedRowsByDate.get(dayKey) : null;
                return {
                  backgroundColor: record ? rowBg[record.tipo_dia] || colors.white : colors.bg,
                };
              }}
              renderDia={(date, dayKey) => {
                const record = selectedEmpleadoId ? selectedRowsByDate.get(dayKey) : null;
                const count = !selectedEmpleadoId ? calendarCountsByDate.get(dayKey) : 0;

                return (
                  <>
                    {record && (
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: estadoConfig[record.tipo_dia]?.bg,
                          color: estadoConfig[record.tipo_dia]?.text,
                        }}
                      >
                        {estadoConfig[record.tipo_dia]?.label || 'Registro'}
                      </span>
                    )}
                    {record && Number(record.minutos_retraso || 0) > 0 && (
                      <div className="text-[11px] font-semibold" style={{ color: colors.warning }}>
                        {record.minutos_retraso} min
                      </div>
                    )}
                    {!selectedEmpleadoId && count > 0 && (
                      <div className="text-[12px] font-semibold text-[#376644]">✓ {count}</div>
                    )}
                  </>
                );
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default AsistenciaPage;
