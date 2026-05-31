import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Umbrella,
  User,
} from 'lucide-react';

import Header from '../../components/layout/Header';
import { getDepartamentos, getEmpleados } from '../../api/empleados';
import { getReportes } from '../../api/reportes';
import client from '../../api/client';

dayjs.locale('es');

const REPORT_TYPES = [
  {
    id: 'planilla',
    title: 'Planilla de Asistencia',
    subtitle: 'Formato OVT · Ministerio de Trabajo',
    icon: FileSpreadsheet,
  },
  {
    id: 'vacaciones',
    title: 'Vacaciones Acumuladas',
    subtitle: 'Art. 44 LGT · Por empleado o área',
    icon: Umbrella,
  },
  {
    id: 'retrasos',
    title: 'Retrasos y Faltas',
    subtitle: 'Descuentos y ausencias del período',
    icon: Clock,
  },
  {
    id: 'individual',
    title: 'Reporte Individual',
    subtitle: 'Historial completo de un empleado',
    icon: User,
  },
];

const FALLBACK_AREAS = ['Todas las áreas', 'Administración', 'Operaciones', 'Logística', 'Recursos Humanos'];

const MOCK_HISTORY = [
  {
    id: 'local-1',
    tipo: 'Planilla de Asistencia',
    periodo: 'Abril 2026',
    formato: 'XLSX',
    fecha: '2026-04-05T09:30:00',
    fileName: 'planilla_asistencia_2026_04.xlsx',
    local: true,
  },
  {
    id: 'local-2',
    tipo: 'Vacaciones Acumuladas',
    periodo: '1T 2026',
    formato: 'PDF',
    fecha: '2026-04-01T17:45:00',
    fileName: 'vacaciones_acumuladas_q1_2026.pdf',
    local: true,
  },
  {
    id: 'local-3',
    tipo: 'Retrasos y Faltas',
    periodo: 'Febrero 2026',
    formato: 'XLSX',
    fecha: '2026-03-03T11:20:00',
    fileName: 'retrasos_faltas_feb_2026.xlsx',
    local: true,
  },
];

const toDateInput = (value) => dayjs(value).format('YYYY-MM-DD');
const formatPeriod = (fromDate, toDate) => `${dayjs(fromDate).format('DD/MM/YYYY')} - ${dayjs(toDate).format('DD/MM/YYYY')}`;

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const ReportCard = ({ report, selected, onSelect }) => {
  const Icon = report.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(report.id)}
      className={`relative flex h-full min-h-[126px] w-full flex-col rounded-xl border p-4 text-left shadow-sm transition ${
        selected ? 'border-2 border-[#03178C] bg-[#EBF4FF]' : 'border-slate-200 bg-white hover:border-[#03178C]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? 'bg-[#03178C] text-white' : 'bg-slate-50 text-slate-500'}`}>
          <Icon className="h-5 w-5" />
        </div>

        <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-[#03178C] bg-[#03178C] text-white' : 'border-slate-300 text-transparent'}`}>
          <Check className="h-3 w-3" />
        </span>
      </div>

      <div className="mt-3 pr-2">
        <h3 className={`text-sm font-medium ${selected ? 'font-bold text-[#03178C]' : 'text-slate-900'}`}>{report.title}</h3>
        <p className="mt-1 text-xs text-slate-500">{report.subtitle}</p>
      </div>
    </button>
  );
};

const SelectField = ({ label, value, onChange, children, disabled = false }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[13px] font-medium text-slate-700">{label}</span>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#03178C] focus:ring-2 focus:ring-[#03178C]/10 disabled:bg-slate-50"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  </label>
);

const Reportes = () => {
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [formato, setFormato] = useState('XLSX');
  const [fechaDesde, setFechaDesde] = useState('2026-04-01');
  const [fechaHasta, setFechaHasta] = useState('2026-04-30');
  const [area, setArea] = useState('all');
  const [empleadoQuery, setEmpleadoQuery] = useState('');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [areas, setAreas] = useState([{ id: 'all', nombre: 'Todas las áreas' }]);
  const [empleados, setEmpleados] = useState([]);
  const [historialApi, setHistorialApi] = useState([]);
  const [estado, setEstado] = useState('idle');
  const [mensajeError, setMensajeError] = useState('');
  const [archivoGenerado, setArchivoGenerado] = useState(null);
  const [historialLocal, setHistorialLocal] = useState(MOCK_HISTORY);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [departamentosResult, empleadosResult, reportesResult] = await Promise.allSettled([
          getDepartamentos(),
          getEmpleados({ limit: 200 }),
          getReportes(),
        ]);

        if (!active) return;

        if (departamentosResult.status === 'fulfilled') {
          const remoteAreas = departamentosResult.value.map((item) => ({
            id: item.id,
            nombre: item.nombre || item.name || item.codigo || 'Área',
          }));
          setAreas([{ id: 'all', nombre: 'Todas las áreas' }, ...remoteAreas]);
        }

        if (empleadosResult.status === 'fulfilled') {
          setEmpleados(
            empleadosResult.value.map((item) => ({
              id: item.id,
              nombre: `${item.nombres || ''} ${item.apellidos || ''}`.trim() || item.nombre || `Empleado ${item.id}`,
            }))
          );
        }

        if (reportesResult.status === 'fulfilled') {
          setHistorialApi(reportesResult.value);
        }
      } catch {
        setAreas(FALLBACK_AREAS.map((nombre, index) => ({ id: index === 0 ? 'all' : index, nombre })));
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const employeeSuggestions = useMemo(() => {
    const query = empleadoQuery.trim().toLowerCase();
    if (!query) return [];
    return empleados.filter((item) => item.nombre.toLowerCase().includes(query)).slice(0, 6);
  }, [empleadoQuery, empleados]);

  const historyRows = useMemo(() => {
    const apiRows = historialApi.map((item) => ({
      id: item.id,
      tipo: item.tipo_reporte === 'planilla' ? 'Planilla de Asistencia' : item.tipo_reporte === 'vacaciones' ? 'Vacaciones Acumuladas' : item.tipo_reporte === 'individual' ? 'Reporte Individual' : 'Asistencia Mensual',
      periodo: `${dayjs(item.periodo_inicio).format('DD/MM/YYYY')} - ${dayjs(item.periodo_fin).format('DD/MM/YYYY')}`,
      formato: item.formato,
      fecha: item.fecha_generacion,
      fileName: item.ruta_archivo ? item.ruta_archivo.split(/[\\/]/).pop() : `reporte-${item.id}`,
      local: false,
    }));

    return [...historialLocal, ...apiRows]
      .sort((left, right) => dayjs(right.fecha).valueOf() - dayjs(left.fecha).valueOf())
      .slice(0, 5);
  }, [historialApi, historialLocal]);

  const resetState = () => {
    setEstado('idle');
    setMensajeError('');
    setArchivoGenerado(null);
  };

  const handleGenerate = async () => {
    if (!tipoSeleccionado) return;
    if (tipoSeleccionado === 'individual' && !empleadoSeleccionado) {
      setEstado('error');
      setMensajeError('Selecciona un empleado para generar el reporte individual.');
      return;
    }

    setEstado('generating');
    setMensajeError('');

    let generatedBlob = null;

    try {
      let fileName = '';

      if (tipoSeleccionado === 'retrasos') {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const content = [
          'Reporte de Retrasos y Faltas',
          `Período: ${formatPeriod(fechaDesde, fechaHasta)}`,
          `Área: ${area === 'all' ? 'Todas las áreas' : area}`,
          `Empleado: ${empleadoSeleccionado ? empleadoSeleccionado.nombre : 'Todos'}`,
        ].join('\n');
        fileName = `retrasos_faltas_${dayjs(fechaDesde).format('YYYY_MM')}.${formato === 'PDF' ? 'pdf' : 'xlsx'}`;
        generatedBlob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        downloadBlob(generatedBlob, fileName);
      } else {
        const payload = {
          id_generado_por: 1,
        };

        if (tipoSeleccionado === 'planilla') {
          payload.anio = dayjs(fechaDesde).year();
          payload.mes = dayjs(fechaDesde).month() + 1;
          if (area !== 'all') payload.id_departamento = Number(area);
          if (empleadoSeleccionado) payload.id_empleado = empleadoSeleccionado.id;
          const response = await client.post('/reportes/planilla', payload);
          const downloadResponse = await client.get(`/reportes/${response.data.id}/descargar`, { responseType: 'blob' });
          fileName = response.data.ruta_archivo ? response.data.ruta_archivo.split(/[\\/]/).pop() : `planilla_${response.data.id}.xlsx`;
          generatedBlob = downloadResponse.data;
          downloadBlob(downloadResponse.data, fileName);
        }

        if (tipoSeleccionado === 'vacaciones') {
          payload.gestion = dayjs(fechaDesde).year();
          if (area !== 'all') payload.id_departamento = Number(area);
          if (empleadoSeleccionado) payload.id_empleado = empleadoSeleccionado.id;
          const response = await client.post('/reportes/vacaciones', payload);
          const downloadResponse = await client.get(`/reportes/${response.data.id}/descargar`, { responseType: 'blob' });
          fileName = response.data.ruta_archivo ? response.data.ruta_archivo.split(/[\\/]/).pop() : `vacaciones_${response.data.id}.xlsx`;
          generatedBlob = downloadResponse.data;
          downloadBlob(downloadResponse.data, fileName);
        }

        if (tipoSeleccionado === 'individual') {
          payload.fecha_inicio = fechaDesde;
          payload.fecha_fin = fechaHasta;
          const response = await client.post(`/reportes/individual/${empleadoSeleccionado.id}`, payload);
          const downloadResponse = await client.get(`/reportes/${response.data.id}/descargar`, { responseType: 'blob' });
          fileName = response.data.ruta_archivo ? response.data.ruta_archivo.split(/[\\/]/).pop() : `individual_${response.data.id}.pdf`;
          generatedBlob = downloadResponse.data;
          downloadBlob(downloadResponse.data, fileName);
        }
      }

      const finalFileName = fileName || `${tipoSeleccionado}_${dayjs().format('YYYYMMDD_HHmm')}.${formato === 'PDF' ? 'pdf' : 'xlsx'}`;

      setArchivoGenerado({
        nombre: finalFileName,
        tipo: tipoSeleccionado,
        blob: generatedBlob,
      });
      setEstado('success');

      setHistorialLocal((current) => [
        {
          id: `local-${Date.now()}`,
          tipo:
            tipoSeleccionado === 'planilla'
              ? 'Planilla de Asistencia'
              : tipoSeleccionado === 'vacaciones'
                ? 'Vacaciones Acumuladas'
                : tipoSeleccionado === 'retrasos'
                  ? 'Retrasos y Faltas'
                  : 'Reporte Individual',
          periodo:
            tipoSeleccionado === 'vacaciones'
              ? `${dayjs(fechaDesde).year()}`
              : formatPeriod(fechaDesde, fechaHasta),
          formato,
          fecha: new Date().toISOString(),
          fileName: finalFileName,
          local: true,
          blob: generatedBlob,
        },
        ...current,
      ]);
    } catch (error) {
      setEstado('error');
      setMensajeError(error?.response?.data?.detail || error?.message || 'No se pudo generar el reporte.');
    }
  };

  const downloadCurrentFile = () => {
    if (!archivoGenerado) return;
    if (archivoGenerado.blob) {
      downloadBlob(archivoGenerado.blob, archivoGenerado.nombre);
    }
  };

  const handleHistoryDownload = async (item) => {
    try {
      if (item.local && item.blob) {
        downloadBlob(item.blob, item.fileName);
        return;
      }

      if (item.id) {
        const response = await client.get(`/reportes/${item.id}/descargar`, { responseType: 'blob' });
        downloadBlob(response.data, item.fileName || `reporte-${item.id}`);
      }
    } catch {
      setEstado('error');
      setMensajeError('No fue posible descargar el reporte seleccionado.');
    }
  };

  const selectedReport = REPORT_TYPES.find((item) => item.id === tipoSeleccionado) || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Reportes y Exportación" subtitle="Generación de reportes normativos y de gestión" />

      <div className="px-4 py-5 lg:px-6">
        <div className="mb-6">
          <h2 className="text-[22px] font-bold text-slate-900">Reportes y Exportación</h2>
          <p className="text-sm text-slate-500">Generación de reportes normativos y de gestión</p>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {REPORT_TYPES.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                selected={tipoSeleccionado === report.id}
                onSelect={(id) => {
                  setTipoSeleccionado(id);
                  resetState();
                }}
              />
            ))}
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ${tipoSeleccionado ? 'mt-6 max-h-[900px] opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 xl:grid xl:grid-cols-2 xl:gap-6">
                <SelectField label="Fecha desde" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)}>
                  <option value={toDateInput('2026-04-01')}>01/04/2026</option>
                  <option value={toDateInput('2026-03-01')}>01/03/2026</option>
                  <option value={toDateInput('2026-05-01')}>01/05/2026</option>
                </SelectField>

                <SelectField label="Fecha hasta" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)}>
                  <option value={toDateInput('2026-04-30')}>30/04/2026</option>
                  <option value={toDateInput('2026-03-31')}>31/03/2026</option>
                  <option value={toDateInput('2026-05-31')}>31/05/2026</option>
                </SelectField>

                <SelectField label="Área" value={area} onChange={(event) => setArea(event.target.value)}>
                  {areas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </SelectField>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-slate-700">Formato de salida</span>
                  <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setFormato('XLSX')}
                      className={`inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition ${formato === 'XLSX' ? 'bg-[#03178C] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormato('PDF')}
                      className={`inline-flex flex-1 items-center justify-center gap-2 border-l border-slate-200 px-4 py-2.5 text-sm font-semibold transition ${formato === 'PDF' ? 'bg-[#03178C] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      <FileText className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                </div>

                {selectedReport?.id === 'individual' ? (
                  <label className="flex flex-col gap-1.5 xl:col-span-2">
                    <span className="text-[13px] font-medium text-slate-700">Empleado</span>
                    <div className="relative">
                      <input
                        value={empleadoQuery}
                        onChange={(event) => {
                          setEmpleadoQuery(event.target.value);
                          setEmpleadoSeleccionado(null);
                        }}
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#03178C] focus:ring-2 focus:ring-[#03178C]/10"
                        placeholder="Escribe un nombre"
                      />
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      {employeeSuggestions.length > 0 && empleadoQuery.trim().length > 0 && (
                        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                          {employeeSuggestions.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setEmpleadoSeleccionado(item);
                                setEmpleadoQuery(item.nombre);
                              }}
                              className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left transition last:border-b-0 hover:bg-slate-50"
                            >
                              <span className="text-sm font-medium text-slate-900">{item.nombre}</span>
                              <span className="text-xs text-slate-500">Seleccionar</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#D9A404] px-6 py-3 text-sm font-bold text-[#03178C] shadow-sm transition hover:bg-[#c79400]"
                >
                  <FileSpreadsheet className="h-4 w-4 text-white" />
                  Generar Reporte
                </button>

                {tipoSeleccionado && (
                  <span className="text-sm text-slate-500">{selectedReport?.title}</span>
                )}
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {estado === 'generating' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <Loader2 className="h-4 w-4 animate-spin text-[#03178C]" />
                      Generando reporte... esto puede tomar unos segundos
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-[#03178C]" />
                    </div>
                  </div>
                )}

                {estado === 'success' && archivoGenerado && (
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0FFF4] text-[#376644]">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{archivoGenerado.nombre}</p>
                        <p className="text-xs text-slate-500">Reporte generado correctamente</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={downloadCurrentFile}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#03178C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021266]"
                      >
                        <Download className="h-4 w-4" />
                        Descargar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTipoSeleccionado(null);
                          resetState();
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#03178C]"
                      >
                        Generar otro
                      </button>
                    </div>
                  </div>
                )}

                {estado === 'error' && (
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3 text-sm text-[#731B07]">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      <span>{mensajeError || 'No se pudo generar el reporte.'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#03178C]"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Historial</h3>
              <p className="text-sm text-slate-500">Últimos 5 reportes generados</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  {['Tipo', 'Período', 'Formato', 'Fecha de generación', 'Descargar'].map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {historyRows.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.tipo}</td>
                    <td className="px-4 py-3 text-slate-600">{item.periodo}</td>
                    <td className="px-4 py-3 text-slate-600">{item.formato}</td>
                    <td className="px-4 py-3 text-slate-600">{dayjs(item.fecha).format('DD/MM/YYYY HH:mm')}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleHistoryDownload(item)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#EBF4FF] px-3 py-2 text-sm font-semibold text-[#03178C] transition hover:bg-[#dce9ff]"
                      >
                        <Download className="h-4 w-4" />
                        Descargar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Reportes;