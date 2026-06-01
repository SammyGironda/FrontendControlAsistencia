import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  Cake,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  CalendarDays,
  FileSpreadsheet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { getRetrasosPorMes, getHorasTrabajadasMes, getCumpleanosProximos } from '../../api/dashboard';
import { getEmpleados, getHorarios } from '../../api/empleados';
import { getIncidencias, getArchivosExcel } from '../../api/marcaciones';

dayjs.locale('es');

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const getInitials = (name = '') => {
  const names = name.split(' ').filter(Boolean);
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const avatarColors = [
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-yellow-200 text-yellow-800',
  'bg-purple-200 text-purple-800',
  'bg-pink-200 text-pink-800',
];

const getAvatarColor = (id) => avatarColors[id % avatarColors.length];

const monthOptions = (() => {
  const currentYear = dayjs().year();
  const years = [currentYear, currentYear - 1];
  return years.flatMap((year) =>
    MONTH_LABELS.map((label, index) => ({
      mes: index + 1,
      anio: year,
      label: `${label} ${year}`,
    }))
  );
})();

const formatMonthLabel = (mesKey) => {
  const [year, month] = mesKey.split('-');
  const idx = Number(month) - 1;
  return MONTH_LABELS[idx] ?? mesKey;
};

const Badge = ({ children, className = '' }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>
);

const SortHeader = ({ label, field, sortField, sortOrder, onClick }) => {
  const isActive = sortField === field;
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={`flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-gray-900' : 'text-gray-500'}`}
    >
      {label}
      {isActive && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
    </button>
  );
};

const SkeletonChart = () => (
  <div className="bg-white rounded-[12px] p-6 shadow-sm animate-pulse min-h-[300px]">
    <div className="h-4 bg-gray-200 rounded w-44 mb-4"></div>
    <div className="space-y-3">
      {[...Array(3)].map((_, idx) => (
        <div key={idx} className="h-12 bg-gray-200 rounded"></div>
      ))}
    </div>
  </div>
);

const Dashboard = () => {
  const currentMonth = dayjs().month() + 1;
  const currentYear = dayjs().year();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [sortField, setSortField] = useState('total_horas_trabajadas');
  const [sortOrder, setSortOrder] = useState('desc');
  const [tableView, setTableView] = useState('top');

  const {
    data: retrasosData,
    isLoading: isLoadingRetrasos,
    isError: isErrorRetrasos,
  } = useQuery({
    queryKey: ['dashboard', 'retrasosPorMes', 5],
    queryFn: () => getRetrasosPorMes(5),
    staleTime: 300000,
  });

  const {
    data: horasData,
    isLoading: isLoadingHoras,
    isError: isErrorHoras,
  } = useQuery({
    queryKey: ['dashboard', 'horasTrabajadasMes', selectedMonth, selectedYear],
    queryFn: () => getHorasTrabajadasMes(selectedMonth, selectedYear),
    staleTime: 300000,
    enabled: Boolean(selectedMonth && selectedYear),
  });

  const {
    data: cumpleData,
    isLoading: isLoadingCumple,
    isError: isErrorCumple,
  } = useQuery({
    queryKey: ['dashboard', 'cumpleanosProximos', 30],
    queryFn: () => getCumpleanosProximos(30),
    staleTime: 300000,
  });

  const {
    data: incidenciasData,
    isLoading: isLoadingIncidencias,
    isError: isErrorIncidencias,
  } = useQuery({
    queryKey: ['dashboard', 'incidenciasPendientes'],
    queryFn: () => getIncidencias(),
    staleTime: 300000,
  });

  const {
    data: empleadosData,
    isLoading: isLoadingEmpleados,
    isError: isErrorEmpleados,
  } = useQuery({
    queryKey: ['empleados', 'activo'],
    queryFn: () => getEmpleados({ estado: 'activo', limit: 500 }),
    staleTime: 300000,
  });

  const {
    data: horariosData,
    isLoading: isLoadingHorarios,
    isError: isErrorHorarios,
  } = useQuery({
    queryKey: ['horarios', 'activos'],
    queryFn: () => getHorarios(),
    staleTime: 300000,
  });

  const {
    data: archivosData,
    isLoading: isLoadingArchivos,
    isError: isErrorArchivos,
  } = useQuery({
    queryKey: ['marcaciones', 'archivos', 1],
    queryFn: () => getArchivosExcel({ limit: 1, skip: 0 }),
    staleTime: 300000,
  });

  const empleadosActivos = useMemo(() => {
    if (isErrorEmpleados) return '—';
    if (Array.isArray(empleadosData)) return empleadosData.length;
    return 0;
  }, [empleadosData, isErrorEmpleados]);

  const turnosConfigurados = useMemo(() => {
    if (isErrorHorarios) return '—';
    if (Array.isArray(horariosData)) return horariosData.length;
    return 0;
  }, [horariosData, isErrorHorarios]);

  const ultimoExcel = useMemo(() => {
    if (!Array.isArray(archivosData) || archivosData.length === 0) return null;
    return archivosData[0];
  }, [archivosData]);

  const registrosMesActual = useMemo(() => {
    if (!horasData?.por_empleado) return null;
    return horasData.por_empleado.reduce((sum, empleado) => sum + (empleado.dias_presentes || 0), 0);
  }, [horasData]);

  const graficoData = useMemo(() => {
    if (!Array.isArray(retrasosData)) return [];
    return retrasosData.map((item) => ({
      ...item,
      mes_label: formatMonthLabel(item.mes),
    }));
  }, [retrasosData]);

  const currentMonthKey = dayjs().format('YYYY-MM');
  const currentMonthIndex = graficoData.findIndex((item) => item.mes === currentMonthKey);
  const currentMonthItem = currentMonthIndex !== -1 ? graficoData[currentMonthIndex] : graficoData[graficoData.length - 1];
  const previousMonthItem = currentMonthIndex > 0 ? graficoData[currentMonthIndex - 1] : graficoData[graficoData.length - 2];

  const diferenciaRetrasos = useMemo(() => {
    if (!currentMonthItem || !previousMonthItem) return null;
    const prev = previousMonthItem.dias_con_retraso;
    const current = currentMonthItem.dias_con_retraso;
    if (prev === 0 && current === 0) return { label: '0%', color: 'bg-green-100 text-success', sign: '▼' };
    if (prev === 0) return { label: '∞', color: 'bg-red-100 text-danger', sign: '▲' };
    const delta = current - prev;
    const percent = Math.round((delta / prev) * 100);
    if (delta > 0) return { label: `+${percent}%`, color: 'bg-red-100 text-danger', sign: '▲' };
    return { label: `${percent}%`, color: 'bg-green-100 text-success', sign: '▼' };
  }, [currentMonthItem, previousMonthItem]);

  const incidenciasItems = incidenciasData?.items ?? [];
  const incidenciaCounts = useMemo(() => {
    if (!Array.isArray(incidenciasItems)) {
      return { huerfana: 0, duplicada: 0, inconsistente: 0 };
    }

    return {
      huerfana: incidenciasItems.filter((item) => item.tipo_incidencia === 'huerfana').length,
      duplicada: incidenciasItems.filter((item) => item.tipo_incidencia === 'duplicada').length,
      inconsistente: incidenciasItems.filter((item) => item.tipo_incidencia === 'inconsistente').length,
    };
  }, [incidenciasItems]);

  const totalHorasExtra = useMemo(() => {
    if (!horasData?.por_empleado) return 0;
    return horasData.por_empleado.reduce((sum, empleado) => sum + (empleado.total_horas_extra || 0), 0);
  }, [horasData]);

  const sortedHorasRows = useMemo(() => {
    if (!horasData?.por_empleado) return [];
    const rows = [...horasData.por_empleado];
    rows.sort((a, b) => {
      const valueA = a[sortField] ?? 0;
      const valueB = b[sortField] ?? 0;
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [horasData, sortField, sortOrder]);

  const displayedHorasRows = useMemo(() => {
    if (!sortedHorasRows.length) return [];
    if (tableView === 'top') return sortedHorasRows.slice(0, 10);
    if (tableView === 'bottom') return sortedHorasRows.slice(-10).reverse();
    return sortedHorasRows;
  }, [sortedHorasRows, tableView]);

  const totalHorasEmpleados = horasData?.por_empleado?.length ?? 0;
  const promedioHoras = horasData?.resumen?.promedio_horas_por_empleado ?? 0;
  const totalHorasEmpresa = horasData?.resumen?.total_horas_empresa ?? 0;
  const badgeEmpleadosPeriodo = totalHorasEmpleados;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="p-6 bg-surface min-h-full font-sans">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Panel de Control</h1>
          <p className="text-sm text-gray-500 mt-2">Resumen — {dayjs().format('MMMM YYYY')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-semibold">Mes actual: {MONTH_LABELS[currentMonth - 1]} {currentYear}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[65%_35%] gap-6">
        <div className="space-y-6">
          <section className="bg-white rounded-[12px] p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Tendencia de Retrasos</h2>
                <p className="text-sm text-gray-500">Últimos 5 meses</p>
              </div>
              <div>
                {diferenciaRetrasos ? (
                  <Badge className={`${diferenciaRetrasos.color}`}>
                    {diferenciaRetrasos.sign} {diferenciaRetrasos.label}
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600">Sin comparación</Badge>
                )}
              </div>
            </div>

            <div className="mt-6 h-[260px]">
              {isLoadingRetrasos ? (
                <SkeletonChart />
              ) : isErrorRetrasos ? (
                <div className="rounded-[12px] border border-red-100 bg-red-50 p-6 text-sm text-red-700">No se pudo cargar la tendencia de retrasos.</div>
              ) : !graficoData.length ? (
                <div className="rounded-[12px] border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">Sin registros de asistencia en este período.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={graficoData} margin={{ top: 20, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="mes_label" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 12 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
                      formatter={(value, name) => {
                        if (name === 'dias_con_retraso') return [value, 'Días con retraso'];
                        if (name === 'promedio_minutos') return [`${value} min`, 'Promedio minutos'];
                        return [value, name];
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                    <Bar yAxisId="left" dataKey="dias_con_retraso" name="Días con retraso" fill="#03178C" radius={[8, 8, 0, 0]}>
                      {graficoData.map((entry) => (
                        <Cell key={`cell-${entry.mes}`} fillOpacity={entry.mes === currentMonthKey ? 1 : 0.75} />
                      ))}
                    </Bar>
                    <Bar yAxisId="right" dataKey="promedio_minutos" name="Promedio de minutos" fill="#D9A404" radius={[8, 8, 0, 0]}>
                      {graficoData.map((entry) => (
                        <Cell key={`cell-avg-${entry.mes}`} fillOpacity={entry.mes === currentMonthKey ? 1 : 0.75} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="bg-white rounded-[12px] p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Horas Trabajadas — {MONTH_LABELS[selectedMonth - 1]}</h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <label htmlFor="month-select" className="font-medium">Periodo</label>
                  <select
                    id="month-select"
                    className="bg-transparent outline-none"
                    value={`${selectedYear}-${selectedMonth}`}
                    onChange={(event) => {
                      const [anio, mes] = event.target.value.split('-').map(Number);
                      setSelectedYear(anio);
                      setSelectedMonth(mes);
                    }}
                  >
                    {monthOptions.map((option) => (
                      <option key={`${option.anio}-${option.mes}`} value={`${option.anio}-${option.mes}`}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Badge className="bg-primary text-white">{badgeEmpleadosPeriodo} empleados</Badge>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[12px] border-l-4 border-primary bg-surface p-4">
                <p className="text-sm text-gray-500">Total horas empresa</p>
                <p className="mt-3 text-2xl font-semibold text-gray-900">{totalHorasEmpresa.toFixed(2)} hrs</p>
              </div>
              <div className="rounded-[12px] border-l-4 border-accent bg-surface p-4">
                <p className="text-sm text-gray-500">Promedio por empleado</p>
                <p className="mt-3 text-2xl font-semibold text-gray-900">{promedioHoras.toFixed(2)} hrs/mes</p>
              </div>
              <div className="rounded-[12px] border-l-4 border-success bg-surface p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total horas extra</p>
                    <p className="mt-3 text-2xl font-semibold text-gray-900">{totalHorasExtra.toFixed(2)} hrs</p>
                  </div>
                  {totalHorasExtra > 0 ? (
                    <Badge className="bg-warning text-black">Revisar</Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[12px] border border-gray-200">
              <div className="grid grid-cols-4 gap-0 border-b border-gray-200 bg-surface px-4 py-3">
                <SortHeader label="Empleado" field="nombre_completo" sortField={sortField} sortOrder={sortOrder} onClick={handleSort} />
                <SortHeader label="Horas Trabajadas" field="total_horas_trabajadas" sortField={sortField} sortOrder={sortOrder} onClick={handleSort} />
                <SortHeader label="Horas Extra" field="total_horas_extra" sortField={sortField} sortOrder={sortOrder} onClick={handleSort} />
                <SortHeader label="Días Presentes" field="dias_presentes" sortField={sortField} sortOrder={sortOrder} onClick={handleSort} />
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {isLoadingHoras ? (
                  <div className="space-y-3 p-4">
                    {[...Array(6)].map((_, idx) => (
                      <div key={idx} className="h-12 rounded-lg bg-gray-100" />
                    ))}
                  </div>
                ) : isErrorHoras ? (
                  <div className="p-6 text-sm text-red-700">No se pudo cargar las horas trabajadas para el periodo seleccionado.</div>
                ) : !displayedHorasRows.length ? (
                  <div className="p-6 text-sm text-gray-600">Sin registros de asistencia en este período.</div>
                ) : (
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <tbody>
                      {displayedHorasRows.map((empleado) => {
                        const porcentaje = Math.min(100, Math.round((empleado.total_horas_trabajadas / 160) * 100));
                        const barraColor = porcentaje >= 140 ? 'bg-primary' : porcentaje >= 100 ? 'bg-warning' : 'bg-danger';
                        return (
                          <tr key={empleado.id_empleado} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-4 py-3 text-gray-700">{empleado.nombre_completo}</td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-gray-900">{empleado.total_horas_trabajadas.toFixed(2)} hrs</div>
                              <div className="mt-2 h-2.5 w-full rounded-full bg-gray-100">
                                <div className={`${barraColor} h-2.5 rounded-full`} style={{ width: `${porcentaje}%` }} />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${empleado.total_horas_extra > 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'}`}>
                                {empleado.total_horas_extra.toFixed(2)} hrs
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{empleado.dias_presentes}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <button
                type="button"
                className={`rounded-full px-4 py-2 ${tableView === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setTableView('all')}
              >
                Mostrar todos
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 ${tableView === 'top' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setTableView('top')}
              >
                Top 10
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 ${tableView === 'bottom' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setTableView('bottom')}
              >
                Bottom 10
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-[12px] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-gray-900">Cumpleaños Próximos</h3>
              </div>
              <Badge className="bg-blue-100 text-blue-800">{cumpleData?.length ?? 0}</Badge>
            </div>

            <div className="mt-5 max-h-[320px] overflow-y-auto">
              {isLoadingCumple ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="h-16 rounded-[12px] bg-gray-100" />
                  ))}
                </div>
              ) : isErrorCumple ? (
                <div className="text-sm text-red-700">No se pudieron cargar los cumpleaños.</div>
              ) : !cumpleData?.length ? (
                <div className="rounded-[12px] border border-gray-200 p-8 text-center text-sm text-gray-600">
                  <CalendarDays className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                  Sin cumpleaños en los próximos 30 días
                </div>
              ) : (
                <div className="space-y-3">
                  {cumpleData.slice(0, 5).map((item) => {
                    const label = item.dias_hasta === 0
                      ? '🎂 ¡Hoy!'
                      : item.dias_hasta === 1
                      ? 'Mañana'
                      : item.dias_hasta <= 7
                      ? `En ${item.dias_hasta} días`
                      : dayjs(item.fecha_nacimiento).format('DD/MM');
                    const badgeClass = item.dias_hasta === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.dias_hasta === 1
                      ? 'bg-blue-100 text-blue-800'
                      : item.dias_hasta <= 7
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-600';

                    return (
                      <div key={item.id} className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${getAvatarColor(item.id)}`}>
                          {getInitials(item.nombre)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                          <p className="text-xs text-gray-500">{item.cargo}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeClass}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-[12px] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-danger" />
                <h3 className="text-sm font-semibold text-gray-900">Incidencias Pendientes</h3>
              </div>
              {incidenciasItems.length > 0 ? (
                <Badge className="bg-red-100 text-danger">{incidenciasItems.length}</Badge>
              ) : (
                <Badge className="bg-emerald-100 text-success">Todo resuelto ✓</Badge>
              )}
            </div>

            {isLoadingIncidencias ? (
              <div className="mt-6 space-y-3">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="h-14 rounded-[12px] bg-gray-100" />
                ))}
              </div>
            ) : isErrorIncidencias ? (
              <div className="mt-6 text-sm text-red-700">No se pudieron cargar las incidencias.</div>
            ) : !incidenciasItems.length ? (
              <div className="mt-6 rounded-[12px] bg-green-50 p-6 text-center text-sm text-green-700">
                <CheckCircle className="mx-auto mb-3 h-10 w-10" />
                Sin incidencias pendientes
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[12px] bg-orange-50 p-4 text-center">
                    <p className="text-xs text-orange-700">Huérfanas</p>
                    <p className="mt-2 text-xl font-semibold text-orange-900">{incidenciaCounts.huerfana}</p>
                  </div>
                  <div className="rounded-[12px] bg-yellow-50 p-4 text-center">
                    <p className="text-xs text-yellow-700">Duplicadas</p>
                    <p className="mt-2 text-xl font-semibold text-yellow-900">{incidenciaCounts.duplicada}</p>
                  </div>
                  <div className="rounded-[12px] bg-red-50 p-4 text-center">
                    <p className="text-xs text-red-700">Inconsistentes</p>
                    <p className="mt-2 text-xl font-semibold text-red-900">{incidenciaCounts.inconsistente}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {incidenciasItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-[12px] border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Incidencia #{item.id_marcacion}</p>
                          <p className="text-xs text-gray-500">{dayjs(item.created_at).format('DD/MM/YYYY')}</p>
                        </div>
                        <Badge className={`px-3 py-1 ${item.tipo_incidencia === 'huerfana' ? 'bg-orange-100 text-orange-800' : item.tipo_incidencia === 'duplicada' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {item.tipo_incidencia}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <Link to="/marcaciones/incidencias" className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80">
                  Ver todas las incidencias →
                </Link>
              </div>
            )}
          </section>

          <section className="rounded-[12px] bg-primary p-5 text-white shadow-sm">
            <h3 className="text-sm font-semibold">Resumen del Sistema</h3>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-white/70">Empleados activos</span>
                <span className="font-semibold">{empleadosActivos}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-white/70">Registros este mes</span>
                <span className="font-semibold">{registrosMesActual !== null ? registrosMesActual : 'Pendiente de implementación'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-white/70">Último Excel importado</span>
                <span className="font-semibold">{ultimoExcel ? dayjs(ultimoExcel.fecha_subida).format('DD/MM/YYYY') : 'Pendiente'}</span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-white/70">Turnos configurados</span>
                <span className="font-semibold">{turnosConfigurados}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

