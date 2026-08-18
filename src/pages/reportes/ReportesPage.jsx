import React, { useMemo, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  FileText,
  FileSpreadsheet,
  Calendar,
  CalendarDays,
  User,
  Download,
  Trash2,
  Loader2,
  Check,
  FileX,
} from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import { getEmpleados } from '../../api/empleados';
import * as apiReportes from '../../api/reportes';
import { useReportes, useGenerarReporte, useEliminarReporte } from '../../hooks/useReportes';
import { useEmpleados } from '../../hooks/useEmpleados';

const colors = {
  primary: '#03178C',
  primaryLight: '#EBF4FF',
  accent: '#D9A404',
  success: '#376644',
  successLight: '#F0FFF4',
  danger: '#731B07',
  dangerLight: '#FFF5F5',
  textDark: '#1A202C',
  textMid: '#4A5568',
  border: '#E2E8F0',
  borderLight: '#F7FAFC',
  bg: '#F8FAFC',
  white: '#FFFFFF',
};

const REPORT_CARDS = [
  {
    id: 'planilla',
    title: 'Planilla de Asistencia',
    subtitle: 'OVT — Ministerio de Trabajo',
    icon: FileText,
    badge: { text: 'OVT', tone: 'primary' },
    descripcion: 'Formato oficial requerido por el Observatorio del Trabajo (OVT). Incluye todos los campos normativos.',
    formato: 'XLSX',
  },
  {
    id: 'vacaciones',
    title: 'Vacaciones Acumuladas',
    subtitle: 'Art. 44 — Ley General del Trabajo',
    icon: Calendar,
    badge: { text: 'Art. 44 LGT', tone: 'success' },
    descripcion: 'Detalle de días de vacación acumulados por empleado según antigüedad laboral.',
    formato: 'XLSX',
  },
  {
    id: 'asistencia-mensual',
    title: 'Asistencia Mensual',
    subtitle: 'Resumen mensual agrupado por empleado',
    icon: CalendarDays,
    descripcion: 'Resumen de asistencia, tardanzas y ausencias por empleado en el período seleccionado.',
    formato: 'XLSX',
  },
  {
    id: 'individual',
    title: 'Reporte por Empleado',
    subtitle: 'Historial individual — genera PDF',
    icon: User,
    badge: { text: 'PDF', tone: 'danger' },
    descripcion: 'Informe personalizado por trabajador con resumen mensual y estadísticas de asistencia. Se genera en formato PDF.',
    formato: 'PDF',
  },
];

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

const ReportesPage = () => {
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [fechaDesde, setFechaDesde] = useState(() => format(new Date(), 'yyyy-MM-01'));
  const [fechaHasta, setFechaHasta] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [area, setArea] = useState(null); // TODO: conectar departamentos
  const [empleadoId, setEmpleadoId] = useState(null);
  const [descargandoId, setDescargandoId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { data: reportesData, isLoading: loadingReportes } = useReportes({ limit: 5 });
  const generar = useGenerarReporte();
  const eliminar = useEliminarReporte();

  const { data: empleadosResp } = useEmpleados({ limit: 200 });
  const empleados = empleadosResp?.results || empleadosResp || [];

  useEffect(() => {
    if (confirmDeleteId) {
      const t = setTimeout(() => setConfirmDeleteId(null), 3000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [confirmDeleteId]);

  const recentReportes = useMemo(() => {
    if (!reportesData) return [];
    // backend may return { results } or array
    const items = Array.isArray(reportesData) ? reportesData : reportesData.results || [];
    return items
      .slice()
      .sort((a, b) => new Date(b.fecha_generacion).getTime() - new Date(a.fecha_generacion).getTime())
      .slice(0, 5);
  }, [reportesData]);

  const handleGenerate = async () => {
    if (!tipoSeleccionado) return;
    if (tipoSeleccionado === 'individual' && !empleadoId) return;

    const payload = {};
    let filename = '';

    try {
      if (tipoSeleccionado === 'planilla' || tipoSeleccionado === 'asistencia-mensual') {
        payload.anio = Number(anio);
        payload.mes = Number(mes);
        payload.id_departamento = null;
        filename = `${tipoSeleccionado}-${anio}-${String(mes).padStart(2, '0')}.xlsx`;
      } else if (tipoSeleccionado === 'vacaciones') {
        payload.fecha_inicio = fechaDesde;
        payload.fecha_fin = fechaHasta;
        payload.id_departamento = null;
        filename = `vacaciones-${fechaDesde}-${fechaHasta}.xlsx`;
      } else if (tipoSeleccionado === 'individual') {
        payload.fecha_inicio = fechaDesde;
        payload.fecha_fin = fechaHasta;
        filename = `individual-${empleadoId}-${fechaDesde}_${fechaHasta}.pdf`;
      }

      await generar.mutateAsync({ tipo: tipoSeleccionado, payload, idEmpleado: empleadoId, filename });
      setTipoSeleccionado(null);
    } catch (error) {
      // useGenerarReporte already toasts
    }
  };

  const handleHistoryDownload = async (item) => {
    try {
      setDescargandoId(item.id);
      const blob = await apiReportes.descargarReporte(item.id);
      const name = item.ruta_archivo ? item.ruta_archivo.split(/[\\/]/).pop() : `reporte-${item.id}`;
      downloadBlob(blob, name);
    } catch (err) {
      // ignore, hooks show toasts in other places
    } finally {
      setDescargandoId(null);
    }
  };

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      eliminar.mutate(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Reportes y Exportación"
        subtitle="Generación de reportes normativos y de gestión"
      />

      <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-[16px]" style={{ color: colors.textDark }}>Tipo de Reporte</h3>
              <p className="text-xs text-slate-500 mt-2">Selecciona el tipo de reporte a generar</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {REPORT_CARDS.map((card) => {
                  const active = tipoSeleccionado === card.id;
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        setTipoSeleccionado(card.id);
                      }}
                      className={`flex cursor-pointer items-start justify-between rounded-lg p-4 transition border ${
                        active ? 'border-2' : 'border' }`} 
                      style={{
                        borderColor: active ? colors.primary : colors.border,
                        background: active ? colors.primaryLight : colors.white,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-md`} style={{ background: active ? colors.primary : '#F7FAFC', color: active ? '#fff' : '#94a3b8' }}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={`text-sm font-semibold`} style={{ color: active ? colors.primary : colors.textDark }}>{card.title}</div>
                            {card.badge ? (
                              <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: card.badge.tone === 'primary' ? colors.primaryLight : card.badge.tone === 'success' ? colors.successLight : colors.dangerLight, color: card.badge.tone === 'primary' ? colors.primary : card.badge.tone === 'success' ? colors.success : colors.danger, borderRadius: 20 }}>
                                {card.badge.text}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-500">{card.subtitle}</div>
                          {active && <div className="mt-2 text-sm text-slate-700">{card.descripcion}</div>}
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input type="checkbox" readOnly checked={active} className="h-4 w-4" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {tipoSeleccionado && (
                <div className="mt-6 rounded-xl border p-6" style={{ borderColor: colors.border }}>
                  <h4 className="text-sm font-semibold" style={{ color: colors.textDark }}>Configuración del Reporte</h4>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {(tipoSeleccionado === 'planilla' || tipoSeleccionado === 'asistencia-mensual') && (
                      <>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Año</label>
                          <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" style={{ borderColor: colors.border }} />
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Mes</label>
                          <select value={mes} onChange={(e) => setMes(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" style={{ borderColor: colors.border }}>
                            <option value={1}>Enero</option>
                            <option value={2}>Febrero</option>
                            <option value={3}>Marzo</option>
                            <option value={4}>Abril</option>
                            <option value={5}>Mayo</option>
                            <option value={6}>Junio</option>
                            <option value={7}>Julio</option>
                            <option value={8}>Agosto</option>
                            <option value={9}>Septiembre</option>
                            <option value={10}>Octubre</option>
                            <option value={11}>Noviembre</option>
                            <option value={12}>Diciembre</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Área / Departamento</label>
                          <select value={area ?? ''} onChange={(e) => setArea(e.target.value || null)} className="mt-1 h-11 w-full rounded-lg border px-3" style={{ borderColor: colors.border }}>
                            <option value="">Todos los departamentos</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Formato</label>
                          <div className="mt-1 h-11 w-full rounded-lg border px-3 flex items-center" style={{ borderColor: colors.border }}>
                            <FileSpreadsheet className="mr-2" /> {REPORT_CARDS.find((c) => c.id === tipoSeleccionado)?.formato}
                          </div>
                        </div>
                      </>
                    )}

                    {tipoSeleccionado === 'vacaciones' && (
                      <>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Fecha Desde</label>
                          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" style={{ borderColor: colors.border }} />
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Fecha Hasta</label>
                          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" style={{ borderColor: colors.border }} />
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Área / Departamento</label>
                          <select value={area ?? ''} onChange={(e) => setArea(e.target.value || null)} className="mt-1 h-11 w-full rounded-lg border px-3" style={{ borderColor: colors.border }}>
                            <option value="">Todos los departamentos</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Formato</label>
                          <div className="mt-1 h-11 w-full rounded-lg border px-3 flex items-center" style={{ borderColor: colors.border }}>
                            <FileSpreadsheet className="mr-2" /> XLSX
                          </div>
                        </div>
                      </>
                    )}

                    {tipoSeleccionado === 'individual' && (
                      <>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Empleado</label>
                          <select value={empleadoId ?? ''} onChange={(e) => setEmpleadoId(e.target.value || null)} className="mt-1 h-11 w-full rounded-lg border px-3" style={{ borderColor: colors.border }}>
                            <option value="">Selecciona un empleado</option>
                            {empleados.map((emp) => (
                              <option key={emp.id} value={emp.id}>{`${emp.nombres || emp.nombre || ''} ${emp.apellidos || ''}`.trim() || `Empleado ${emp.id}`}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Formato</label>
                          <div className="mt-1 h-11 w-full rounded-lg border px-3 flex items-center" style={{ borderColor: colors.border }}>
                            <FileText className="mr-2 text-red-600" /> PDF
                          </div>
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Fecha Desde</label>
                          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" style={{ borderColor: colors.border }} />
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700">Fecha Hasta</label>
                          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" style={{ borderColor: colors.border }} />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={tipoSeleccionado === 'individual' && !empleadoId}
                      className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-bold"
                      style={{ background: colors.accent, color: colors.primary }}
                    >
                      {generar.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : REPORT_CARDS.find((c) => c.id === tipoSeleccionado)?.formato === 'PDF' ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                      {generar.isLoading ? 'Generando...' : 'Generar Reporte'}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Historial</h3>
              <p className="text-sm text-slate-500">Últimos 5 reportes generados</p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                      {['Tipo', 'Período', 'Formato', 'Fecha de generación', 'Acciones'].map((column) => (
                        <th key={column} className="px-4 py-3 font-semibold">{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentReportes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <FileX className="h-8 w-8 text-slate-300" />
                            Aún no hay reportes generados
                          </div>
                        </td>
                      </tr>
                    )}

                    {recentReportes.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">{item.tipo_reporte || item.tipo}</td>
                        <td className="px-4 py-3 text-slate-600">{item.periodo ? `${format(parseISO(item.periodo_inicio || item.periodo || item.fecha_generacion), 'dd/MM/yyyy')}` : '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{item.formato || 'XLSX'}</td>
                        <td className="px-4 py-3 text-slate-600">{item.fecha_generacion ? format(parseISO(item.fecha_generacion), 'dd/MM/yyyy HH:mm') : '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => handleHistoryDownload(item)} className="inline-flex items-center gap-2 rounded-lg bg-[#EBF4FF] px-3 py-2 text-sm font-semibold text-[#03178C]">
                              {descargandoId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              Descargar
                            </button>

                            <div>
                              {confirmDeleteId === item.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button type="button" onClick={() => handleDelete(item.id)} className="inline-flex items-center rounded-full bg-green-50 p-2 text-green-600">
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="inline-flex items-center rounded-full bg-red-50 p-2 text-red-600">
                                    <span className="text-sm">X</span>
                                  </button>
                                </div>
                              ) : (
                                <button type="button" onClick={() => handleDelete(item.id)} className="inline-flex items-center rounded-lg p-2 text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="col-span-12 lg:col-span-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Reportes Recientes</h4>
                <button type="button" className="text-sm text-[#03178C]">Ver todos</button>
              </div>

              <div className="mt-4">
                {loadingReportes ? (
                  <div className="space-y-3">
                    <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                  </div>
                ) : recentReportes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-6 text-slate-500">
                    <FileX className="h-8 w-8 text-slate-300" />
                    <div>Aún no hay reportes generados</div>
                  </div>
                ) : (
                  <ul className="mt-2 divide-y">
                    {recentReportes.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: r.formato === 'PDF' ? colors.dangerLight : colors.successLight }}>
                            <FileText className="h-4 w-4" style={{ color: r.formato === 'PDF' ? colors.danger : colors.success }} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{r.nombre || r.tipo_reporte || r.tipo}</div>
                            <div className="text-xs text-slate-500">{r.fecha_generacion ? format(parseISO(r.fecha_generacion), 'dd/MM/yyyy') : '-' } · {r.tipo_reporte || r.tipo}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleHistoryDownload(r)} className="text-slate-500 hover:text-slate-700">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
      </div>
    </div>
  );
};

export default ReportesPage;
