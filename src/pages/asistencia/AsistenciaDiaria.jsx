import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  AlertCircle,
  Activity,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  FileSpreadsheet,
  Search,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';

import Header from '../../components/layout/Header';
import EstadoBadge from '../../components/common/EstadoBadge';
import { getDepartamentos, getEmpleados, getHorarios } from '../../api/empleados';

dayjs.locale('es');

const MONTHS_ES = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const YEAR_OPTIONS = ['2025', '2026', '2027'];
const PAGE_SIZE_OPTIONS = [25, 50, 100];

const FALLBACK_AREAS = ['Administración', 'Operaciones', 'Logística', 'Recursos Humanos'];
const FALLBACK_TURNOS = ['Turno Mañana', 'Turno Tarde', 'Turno Noche', 'Turno Flex'];

const MOCK_EMPLOYEES = [
  { id: 1, nombre: 'Ana María Condori', ci: '7823456', area: 'Administración', turno: 'Turno Mañana' },
  { id: 2, nombre: 'Carlos Rojas Pérez', ci: '6512234', area: 'Operaciones', turno: 'Turno Tarde' },
  { id: 3, nombre: 'Lucía Fernández Vargas', ci: '4987712', area: 'Recursos Humanos', turno: 'Turno Mañana' },
  { id: 4, nombre: 'José Luis Mamani', ci: '7732455', area: 'Logística', turno: 'Turno Noche' },
  { id: 5, nombre: 'Sofía Quispe Huanca', ci: '8129034', area: 'Administración', turno: 'Turno Flex' },
  { id: 6, nombre: 'Miguel Ángel Gutiérrez', ci: '7031188', area: 'Operaciones', turno: 'Turno Tarde' },
];

const BASE_PATTERNS = [
  {
    tipo_dia: 'feriado',
    hora_entrada: '—',
    hora_salida: '—',
    minutos_retraso: null,
    origen_dato: 'API_Biometrico',
    observacion: 'Feriado Nacional',
    incidencia: false,
  },
  {
    tipo_dia: 'presente',
    hora_entrada: '08:01',
    hora_salida: '17:13',
    minutos_retraso: 0,
    origen_dato: 'API_Biometrico',
    observacion: '—',
    incidencia: false,
  },
  {
    tipo_dia: 'presente',
    hora_entrada: '08:00',
    hora_salida: '17:01',
    minutos_retraso: 0,
    origen_dato: 'Excel',
    observacion: '—',
    incidencia: false,
  },
  {
    tipo_dia: 'ausente',
    hora_entrada: '—',
    hora_salida: '—',
    minutos_retraso: null,
    origen_dato: 'API_Biometrico',
    observacion: 'Falta injustificada',
    incidencia: true,
  },
  {
    tipo_dia: 'presente',
    hora_entrada: '08:25',
    hora_salida: '17:05',
    minutos_retraso: 25,
    origen_dato: 'Excel',
    observacion: '25 min tardanza',
    incidencia: true,
  },
  {
    tipo_dia: 'permiso_parcial',
    hora_entrada: '09:15',
    hora_salida: '12:30',
    minutos_retraso: null,
    origen_dato: 'Manual',
    observacion: 'Permiso parcial aprobado',
    incidencia: false,
  },
  {
    tipo_dia: 'descanso',
    hora_entrada: '—',
    hora_salida: '—',
    minutos_retraso: null,
    origen_dato: 'Manual',
    observacion: 'Descanso semanal',
    incidencia: false,
  },
  {
    tipo_dia: 'licencia_medica',
    hora_entrada: '—',
    hora_salida: '—',
    minutos_retraso: null,
    origen_dato: 'Manual',
    observacion: 'Licencia médica',
    incidencia: false,
  },
  {
    tipo_dia: 'presente_exento',
    hora_entrada: '08:00',
    hora_salida: '16:30',
    minutos_retraso: null,
    origen_dato: 'API_Biometrico',
    observacion: 'Cobertura excepcional',
    incidencia: false,
  },
];

const buildMockRows = () => {
  const start = dayjs('2026-04-01');
  const rows = [];

  MOCK_EMPLOYEES.forEach((employee, employeeIndex) => {
    for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
      const pattern = BASE_PATTERNS[(dayIndex + employeeIndex) % BASE_PATTERNS.length];
      const date = start.add(dayIndex, 'day');
      const isEvenEmployee = employeeIndex % 2 === 0;

      rows.push({
        id: employee.id * 100 + dayIndex + 1,
        id_empleado: employee.id,
        empleado_nombre: employee.nombre,
        ci: employee.ci,
        fecha: date.format('YYYY-MM-DD'),
        hora_entrada: pattern.hora_entrada,
        hora_salida: pattern.hora_salida,
        minutos_retraso: pattern.minutos_retraso,
        tipo_dia: pattern.tipo_dia,
        origen_dato: pattern.origen_dato,
        observacion: pattern.observacion,
        incidencia_pendiente: pattern.incidencia && isEvenEmployee,
        area: employee.area,
        turno: employee.turno,
      });
    }
  });

  return rows.sort((left, right) => dayjs(left.fecha).valueOf() - dayjs(right.fecha).valueOf());
};

const MOCK_ROWS = buildMockRows();

const normalizeAsistenciaRow = (row) => ({
  ...row,
  id_empleado: row.id_empleado ?? row.empleadoId ?? row.empleado_id,
  tipo_dia: row.tipo_dia ?? row.tipoDia ?? row.estadoBadge ?? row.estado ?? 'presente',
  hora_entrada: row.hora_entrada ?? row.horaEntrada ?? '—',
  hora_salida: row.hora_salida ?? row.horaSalida ?? '—',
  minutos_retraso: row.minutos_retraso ?? row.minutosRetraso ?? 0,
  origen_dato: row.origen_dato ?? row.origen ?? 'Manual',
  observacion: row.observacion ?? '—',
  empleado_nombre: row.empleado_nombre ?? row.empleadoNombre ?? row.nombre ?? 'Empleado',
});

const FILTER_DEFAULTS = {
  mes: '04',
  anio: '2026',
  area: 'all',
  empleado: '',
  empleadoId: '',
  turno: 'all',
};

const ROW_COLOR_MAP = {
  presente: 'bg-white',
  ausente: 'bg-[#FFF5F5]',
  feriado: 'bg-[#EBF4FF]',
  retraso: 'bg-[#FFFBEB]',
  licencia_medica: 'bg-[#FFF3CD]',
  permiso_parcial: 'bg-[#F8F5D7]',
  descanso: 'bg-[#F1F3F5]',
  presente_exento: 'bg-[#F0FFF4]',
};

const ORIGIN_MAP = {
  Excel: {
    className: 'bg-[#EBF4FF] text-[#03178C] border-[#BEE3F8]',
    icon: FileSpreadsheet,
  },
  API_Biometrico: {
    className: 'bg-[#F0FFF4] text-[#376644] border-[#C6F6D5]',
    icon: Fingerprint,
  },
  API_Biométrico: {
    className: 'bg-[#F0FFF4] text-[#376644] border-[#C6F6D5]',
    icon: Fingerprint,
  },
  Manual: {
    className: 'bg-[#F7FAFC] text-[#718096] border-[#E2E8F0]',
    icon: Activity,
  },
};

const downloadTextFile = (filename, content, mimeType = 'text/csv;charset=utf-8') => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const csvCell = (value) => {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const FilterSelect = ({ label, value, onChange, children, className = '' }) => (
  <label className={`flex flex-col gap-1.5 ${className}`}>
    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-[13px] text-slate-800 shadow-sm outline-none transition focus:border-[#03178C] focus:ring-2 focus:ring-[#03178C]/10"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  </label>
);

const OriginBadge = ({ origin }) => {
  const config = ORIGIN_MAP[origin] || ORIGIN_MAP.Manual;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] font-medium ${config.className}`}
      style={{ background: `linear-gradient(to right, ${origin === 'Excel' ? '#EBF4FF' : origin === 'API_Biometrico' || origin === 'API_Biométrico' ? '#F0FFF4' : '#F7FAFC'}, rgba(255,255,255,0.15))` }}
    >
      <Icon className="h-3 w-3" />
      {origin}
    </span>
  );
};

const AsistenciaDiaria = () => {
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [empleadosCatalogo, setEmpleadosCatalogo] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);

  const [draftFilters, setDraftFilters] = useState(FILTER_DEFAULTS);
  const [appliedFilters, setAppliedFilters] = useState(FILTER_DEFAULTS);
  const [empleadoQuery, setEmpleadoQuery] = useState('');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    let active = true;

    const loadCatalogs = async () => {
      try {
        const [departamentosResult, horariosResult, empleadosResult] = await Promise.allSettled([
          getDepartamentos(),
          getHorarios(),
          getEmpleados({ limit: 200 }),
        ]);

        if (!active) return;

        if (departamentosResult.status === 'fulfilled') {
          setAreas(
            departamentosResult.value
              .map((item) => ({ id: item.id, nombre: item.nombre || item.name || item.codigo || 'Área' }))
              .filter((item, index, array) => array.findIndex((candidate) => candidate.nombre === item.nombre) === index)
          );
        } else {
          setAreas(FALLBACK_AREAS.map((nombre, index) => ({ id: index + 1, nombre })));
        }

        if (horariosResult.status === 'fulfilled') {
          setTurnos(
            horariosResult.value
              .map((item) => ({ id: item.id, nombre: item.nombre || item.descripcion || 'Turno' }))
              .filter((item, index, array) => array.findIndex((candidate) => candidate.nombre === item.nombre) === index)
          );
        } else {
          setTurnos(FALLBACK_TURNOS.map((nombre, index) => ({ id: index + 1, nombre })));
        }

        if (empleadosResult.status === 'fulfilled') {
          setEmpleadosCatalogo(
            empleadosResult.value.map((item) => ({
              id: item.id,
              nombre: `${item.nombres || ''} ${item.apellidos || ''}`.trim() || item.nombre || `Empleado ${item.id}`,
              ci: item.ci_numero || item.ci || '',
            }))
          );
        } else {
          setEmpleadosCatalogo(
            MOCK_EMPLOYEES.map((item) => ({
              id: item.id,
              nombre: item.nombre,
              ci: item.ci,
            }))
          );
        }
      } finally {
        if (active) {
          setLoadingCatalogs(false);
        }
      }
    };

    loadCatalogs();

    return () => {
      active = false;
    };
  }, []);

  const employeeSuggestions = useMemo(() => {
    const query = empleadoQuery.trim().toLowerCase();
    if (!query) return [];
    return empleadosCatalogo
      .filter((item) => item.nombre.toLowerCase().includes(query) || String(item.ci || '').includes(query))
      .slice(0, 6);
  }, [empleadoQuery, empleadosCatalogo]);

  const filteredRows = useMemo(() => {
    return MOCK_ROWS.filter((row) => {
      if (appliedFilters.mes && dayjs(row.fecha).format('MM') !== appliedFilters.mes) return false;
      if (appliedFilters.anio && dayjs(row.fecha).format('YYYY') !== appliedFilters.anio) return false;
      // Filtros solo de frontend: el backend de asistencia todavía no expone `area` ni `turno`.
      if (appliedFilters.area !== 'all' && row.area !== appliedFilters.area) return false;
      if (appliedFilters.turno !== 'all' && row.turno !== appliedFilters.turno) return false;

      if (appliedFilters.empleadoId) {
        return String(row.id_empleado) === String(appliedFilters.empleadoId);
      }

      if (appliedFilters.empleado) {
        return row.empleado_nombre.toLowerCase().includes(appliedFilters.empleado.toLowerCase());
      }

      return true;
    });
  }, [appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, pageSize, safePage]);

  const startRow = filteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRow = Math.min(filteredRows.length, safePage * pageSize);

  const selectedEmployeeMonthRows = useMemo(() => {
    if (!selectedRow) return [];

    return filteredRows.filter(
      (row) => row.id_empleado === selectedRow.id_empleado && dayjs(row.fecha).format('YYYY-MM') === dayjs(selectedRow.fecha).format('YYYY-MM')
    );
  }, [filteredRows, selectedRow]);

  const calendarCells = useMemo(() => {
    if (!selectedRow) return [];

    const monthStart = dayjs(selectedRow.fecha).startOf('month');
    const daysInMonth = monthStart.daysInMonth();
    const rowByDate = new Map(selectedEmployeeMonthRows.map((row) => [dayjs(row.fecha).format('YYYY-MM-DD'), row]));

    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = monthStart.add(index, 'day');
      return {
        date,
        row: rowByDate.get(date.format('YYYY-MM-DD')) || null,
      };
    });
  }, [selectedEmployeeMonthRows, selectedRow]);

  const summary = useMemo(() => {
    const rows = selectedEmployeeMonthRows;
    return {
      presencias: rows.filter((row) => row.tipo_dia === 'presente' || row.tipo_dia === 'presente_exento').length,
      faltas: rows.filter((row) => row.tipo_dia === 'ausente').length,
      retrasos: rows.filter((row) => Number(row.minutos_retraso || 0) > 0).length,
      vacaciones: rows.filter((row) => row.tipo_dia === 'presente_exento').length,
    };
  }, [selectedEmployeeMonthRows]);

  const handleApplyFilters = () => {
    setAppliedFilters({
      ...draftFilters,
      empleado: empleadoSeleccionado ? empleadoSeleccionado.nombre : draftFilters.empleado,
      empleadoId: empleadoSeleccionado ? String(empleadoSeleccionado.id) : draftFilters.empleadoId,
    });
    setSelectedRow(null);
    setPage(1);
  };

  const handleSelectSuggestion = (item) => {
    setEmpleadoSeleccionado(item);
    setEmpleadoQuery(item.nombre);
    setDraftFilters((current) => ({ ...current, empleado: item.nombre, empleadoId: String(item.id) }));
  };

  const clearEmployeeFilter = () => {
    setEmpleadoSeleccionado(null);
    setEmpleadoQuery('');
    setDraftFilters((current) => ({ ...current, empleado: '', empleadoId: '' }));
  };

  const handleExportView = () => {
    const header = ['Empleado', 'CI', 'Fecha', 'Hora entrada', 'Hora salida', 'Min. retraso', 'Tipo día', 'Origen dato', 'Obs.'];
    const body = filteredRows.map((row) => [
      row.empleado_nombre,
      row.ci,
      dayjs(row.fecha).format('DD/MM/YYYY'),
      row.hora_entrada,
      row.hora_salida,
      row.minutos_retraso ? `${row.minutos_retraso} min` : '—',
      row.tipo_dia,
      row.origen_dato,
      row.observacion,
    ]);

    const csv = [header, ...body]
      .map((line) => line.map(csvCell).join(','))
      .join('\n');

    downloadTextFile(`asistencia-vista-${appliedFilters.mes}-${appliedFilters.anio}.csv`, csv);
  };

  const getRowTone = (row) => {
    if (Number(row.minutos_retraso || 0) > 0) return ROW_COLOR_MAP.retraso;
    if (row.tipo_dia === 'presente') return ROW_COLOR_MAP.presente;
    if (row.tipo_dia === 'ausente') return ROW_COLOR_MAP.ausente;
    if (row.tipo_dia === 'feriado') return ROW_COLOR_MAP.feriado;
    if (row.tipo_dia === 'licencia_medica') return ROW_COLOR_MAP.licencia_medica;
    if (row.tipo_dia === 'permiso_parcial') return ROW_COLOR_MAP.permiso_parcial;
    if (row.tipo_dia === 'descanso') return ROW_COLOR_MAP.descanso;
    if (row.tipo_dia === 'presente_exento') return ROW_COLOR_MAP.presente_exento;
    return ROW_COLOR_MAP.presente;
  };

  const openEmployeeProfile = () => {
    if (!selectedRow) return;
    navigate(`/empleados/${selectedRow.id_empleado}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Asistencia y Cálculos" subtitle="Registro detallado · 120 registros · Abril 2026" />

      <div className="px-4 py-5 lg:px-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[22px] font-bold text-slate-900">Asistencia y Cálculos</h2>
            <p className="text-sm text-slate-500">Registro detallado · 120 registros · Abril 2026</p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-[#03178C] shadow-sm transition hover:border-[#03178C] hover:bg-[#EBF4FF]"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Tolerancia: 10 min
          </button>
        </div>

        <section className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <FilterSelect
                label="Mes"
                value={draftFilters.mes}
                onChange={(event) => setDraftFilters((current) => ({ ...current, mes: event.target.value }))}
              >
                {MONTHS_ES.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Año"
                value={draftFilters.anio}
                onChange={(event) => setDraftFilters((current) => ({ ...current, anio: event.target.value }))}
              >
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Área"
                value={draftFilters.area}
                onChange={(event) => setDraftFilters((current) => ({ ...current, area: event.target.value }))}
              >
                <option value="all">Todas las áreas</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.nombre}>
                    {area.nombre}
                  </option>
                ))}
              </FilterSelect>

              <label className="relative flex flex-col gap-1.5 md:col-span-2 xl:col-span-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Empleado</span>
                <div className="relative">
                  <input
                    value={empleadoQuery}
                    onChange={(event) => {
                      setEmpleadoQuery(event.target.value);
                      setEmpleadoSeleccionado(null);
                      setDraftFilters((current) => ({ ...current, empleado: event.target.value, empleadoId: '' }));
                    }}
                    placeholder="Escribe un nombre"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-[13px] text-slate-800 shadow-sm outline-none transition focus:border-[#03178C] focus:ring-2 focus:ring-[#03178C]/10"
                  />
                  {empleadoQuery ? (
                    <button
                      type="button"
                      onClick={clearEmployeeFilter}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  )}

                  {employeeSuggestions.length > 0 && empleadoQuery.trim().length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                      {employeeSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left transition last:border-b-0 hover:bg-slate-50"
                        >
                          <span>
                            <span className="block text-sm font-medium text-slate-900">{item.nombre}</span>
                            <span className="block text-xs text-slate-500">CI {item.ci || '—'}</span>
                          </span>
                          <span className="rounded-full bg-[#EBF4FF] px-2 py-1 text-[11px] font-semibold text-[#03178C]">
                            Seleccionar
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>

              <FilterSelect
                label="Turno"
                value={draftFilters.turno}
                onChange={(event) => setDraftFilters((current) => ({ ...current, turno: event.target.value }))}
                className="md:col-span-2 xl:col-span-1"
              >
                <option value="all">Todos</option>
                {turnos.map((turno) => (
                  <option key={turno.id} value={turno.nombre}>
                    {turno.nombre}
                  </option>
                ))}
              </FilterSelect>
            </div>

            <div className="flex flex-wrap gap-2 xl:pl-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#03178C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021266]"
              >
                Aplicar filtros
              </button>
              <button
                type="button"
                onClick={handleExportView}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#03178C] hover:text-[#03178C]"
              >
                Exportar vista
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="font-semibold text-slate-900">{filteredRows.length.toLocaleString('es-BO')} registros</span>
              <span className="ml-2">mostrados en vista actual</span>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span>Filas por página</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  {['Empleado', 'CI', 'Fecha', 'Hora entrada', 'Hora salida', 'Min. retraso', 'Tipo día', 'Origen dato', 'Obs.'].map((column) => (
                    <th
                      key={column}
                      className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                      {loadingCatalogs ? 'Cargando catálogos...' : 'No hay registros para los filtros seleccionados.'}
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => {
                    const isLate = Number(row.minutos_retraso || 0) > 0;

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedRow(row)}
                        className={`group cursor-pointer border-b border-slate-100 transition hover:shadow-[inset_0_0_0_1px_rgba(3,23,140,0.1)] ${getRowTone(row)}`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{row.empleado_nombre}</span>
                            {row.incidencia_pendiente && <AlertCircle className="h-4 w-4 text-[#D97706]" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{row.ci}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{dayjs(row.fecha).format('DD/MM/YYYY')}</td>
                        <td className={`px-4 py-3 text-sm ${isLate ? 'font-bold text-[#D97706]' : 'font-medium text-slate-900'}`}>
                          {row.hora_entrada || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.hora_salida || '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          {isLate ? (
                            <span className="inline-flex items-center rounded-full bg-[#FFFBEB] px-2.5 py-1 text-[12px] font-semibold text-[#D97706]">
                              {row.minutos_retraso} min
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <EstadoBadge estado={row.tipo_dia} size="sm" />
                        </td>
                        <td className="px-4 py-3">
                          <OriginBadge origin={row.origen_dato} />
                        </td>
                        <td className="px-4 py-3 text-sm italic text-slate-500">{row.observacion || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              Mostrando <span className="font-semibold text-slate-900">{startRow}</span> a{' '}
              <span className="font-semibold text-slate-900">{endRow}</span> de{' '}
              <span className="font-semibold text-slate-900">{filteredRows.length}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#03178C] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#03178C] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <aside
        className={`fixed right-0 top-0 z-40 h-screen w-full max-w-[380px] transform border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${selectedRow ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {selectedRow && (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Detalle del registro</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{selectedRow.empleado_nombre}</h3>
                <p className="text-sm text-slate-500">{dayjs(selectedRow.fecha).format('dddd, DD [de] MMMM [de] YYYY')}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400">Empleado</span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedRow.empleado_nombre}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400">CI</span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedRow.ci}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#03178C]" />
                  <h4 className="text-sm font-semibold text-slate-900">Mini-calendario del mes</h4>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-1">
                  {calendarCells.map(({ date, row }) => {
                    const dayNumber = date.date();
                    const baseClass = 'flex h-10 items-center justify-center rounded-lg border text-xs font-semibold transition';
                    const stateClass = row ? ROW_COLOR_MAP[row.tipo_dia] || 'bg-white' : 'bg-white text-slate-300';
                    const accentClass = row?.minutos_retraso > 0 ? 'border-[#F6AD55] text-[#D97706]' : 'border-slate-200 text-slate-700';

                    return (
                      <div
                        key={date.format('YYYY-MM-DD')}
                        className={`${baseClass} ${stateClass} ${row ? accentClass : 'border-slate-200'}`}
                        title={row ? `${dayNumber} - ${row.tipo_dia}` : dayNumber.toString()}
                      >
                        {dayNumber}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MetricBox label="Presencias" value={summary.presencias} />
                <MetricBox label="Faltas" value={summary.faltas} />
                <MetricBox label="Retrasos" value={summary.retrasos} />
                <MetricBox label="Vacaciones tomadas" value={summary.vacaciones} />
              </div>
            </div>

            <div className="border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={openEmployeeProfile}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#03178C] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021266]"
              >
                <User className="h-4 w-4" />
                Ver perfil completo
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

const MetricBox = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <span className="text-[11px] uppercase tracking-wider text-slate-400">{label}</span>
    <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

export default AsistenciaDiaria;