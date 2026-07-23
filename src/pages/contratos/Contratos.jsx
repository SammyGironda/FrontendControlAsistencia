import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getContratos,
} from '../../api/contratos';
import { getEmpleados } from '../../api/empleados';
import { formatFecha, formatMoneda } from '../../lib/formatters';
import { FilePlus, FileCheck, Infinity as InfinityIcon, Clock, AlertTriangle, Eye, RefreshCw, Edit, XCircle, CheckSquare, FileX, Search } from 'lucide-react';
import NuevoContratoModal from './NuevoContratoModal';
import DetalleContratoModal from './DetalleContratoModal';
import RenovarContratoModal from './RenovarContratoModal';
import RescindirContratoModal from './RescindirContratoModal';
import FinalizarContratoModal from './FinalizarContratoModal';

const getInitials = (nombre = '', apellidos = '') => {
  const parts = `${nombre} ${apellidos}`.trim().split(' ').filter(Boolean);
  return parts.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
};

const getDaysRemaining = (fechaFin) => {
  if (!fechaFin) return null;
  return Math.ceil((new Date(fechaFin) - new Date()) / 86400000);
};

const Contratos = () => {
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [vencimientoFiltro, setVencimientoFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [modalActivo, setModalActivo] = useState(null);
  const [contratoSeleccionado, setContratoSeleccionado] = useState(null);

  const contratosQuery = useQuery({
    queryKey: ['contratos', { tipoFiltro, estadoFiltro }],
    queryFn: () => getContratos({ skip: 0, limit: 500, tipo_contrato: tipoFiltro || undefined, estado: estadoFiltro || undefined }),
    keepPreviousData: true,
  });

  const empleadosQuery = useQuery({
    queryKey: ['empleados', 'contratos-list'],
    queryFn: () => getEmpleados({ skip: 0, limit: 500 }),
    staleTime: 1000 * 60 * 5,
  });

  const contratos = Array.isArray(contratosQuery.data) ? contratosQuery.data : [];
  const empleados = Array.isArray(empleadosQuery.data) ? empleadosQuery.data : [];

  const empleadoMap = useMemo(() => {
    return empleados.reduce((map, empleado) => {
      map[empleado.id] = empleado;
      return map;
    }, {});
  }, [empleados]);

  const contratosEnriquecidos = useMemo(() => {
    return contratos.map((contrato) => {
      const empleado = empleadoMap[contrato.id_empleado] || {};
      return {
        ...contrato,
        empleado_nombre: `${empleado.nombres || 'Empleado'} ${empleado.apellidos || ''}`.trim(),
        empleado_ci: empleado.ci_numero || '---',
        empleado_iniciales: getInitials(empleado.nombres, empleado.apellidos),
        dias_restantes: getDaysRemaining(contrato.fecha_fin),
        empleado_departamento: empleado.departamento || undefined,
        empleado_cargo: empleado.cargo || undefined,
      };
    });
  }, [contratos, empleadoMap]);

  const searchLower = search.trim().toLowerCase();
  const contratosFiltrados = useMemo(() => {
    return contratosEnriquecidos.filter((contrato) => {
      const textMatch = !searchLower || [
        contrato.empleado_nombre,
        contrato.empleado_ci,
      ].some((value) => value?.toString().toLowerCase().includes(searchLower));

      if (!textMatch) return false;

      if (vencimientoFiltro) {
        const dias = contrato.dias_restantes;
        if (vencimientoFiltro === 'este_mes' && !(dias !== null && dias >= 0 && dias <= 30)) return false;
        if (vencimientoFiltro === 'prox_30' && !(dias !== null && dias > 0 && dias <= 30)) return false;
        if (vencimientoFiltro === 'prox_60' && !(dias !== null && dias > 30 && dias <= 60)) return false;
        if (vencimientoFiltro === 'vencidos' && !(dias !== null && dias <= 0)) return false;
      }

      return true;
    });
  }, [contratosEnriquecidos, searchLower, vencimientoFiltro]);

  const activeContratosCount = contratosEnriquecidos.filter((c) => c.estado === 'activo').length;
  const indefinidosCount = contratosEnriquecidos.filter((c) => c.tipo_contrato === 'indefinido').length;
  const plazoFijoCount = contratosEnriquecidos.filter((c) => c.tipo_contrato === 'plazo_fijo').length;
  const porVencerCount = contratosEnriquecidos.filter((c) => c.estado === 'activo' && c.tipo_contrato === 'plazo_fijo' && c.dias_restantes !== null && c.dias_restantes > 0 && c.dias_restantes <= 30).length;

  const totalResults = contratosFiltrados.length;
  const pageCount = Math.max(1, Math.ceil(totalResults / limit));
  const currentPage = Math.min(page, pageCount);
  const contratosPagina = contratosFiltrados.slice((currentPage - 1) * limit, currentPage * limit);

  const abrirModal = (tipo, contrato = null) => {
    setContratoSeleccionado(contrato);
    setModalActivo(tipo);
  };

  const cerrarModal = () => {
    setModalActivo(null);
    setContratoSeleccionado(null);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pageCount) return;
    setPage(newPage);
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 px-6 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestión de Contratos</h1>
          <p className="mt-2 text-sm text-slate-500">{activeContratosCount} contratos activos · {porVencerCount} por vencer</p>
        </div>
        <button
          type="button"
          onClick={() => abrirModal('nuevo')}
          className="sticky right-0 z-10 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          <FilePlus className="h-4 w-4" />
          Nuevo Contrato
        </button>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(280px,2fr)_repeat(3,minmax(150px,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por empleado o CI..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 2xl:contents">
            <select
              value={tipoFiltro}
              onChange={(e) => { setTipoFiltro(e.target.value); setPage(1); }}
              className="rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Tipo: Todos</option>
              <option value="indefinido">Indefinido</option>
              <option value="plazo_fijo">Plazo Fijo</option>
            </select>
            <select
              value={estadoFiltro}
              onChange={(e) => { setEstadoFiltro(e.target.value); setPage(1); }}
              className="rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Estado: Todos</option>
              <option value="activo">Activo</option>
              <option value="vencido">Vencido</option>
              <option value="rescindido">Rescindido</option>
              <option value="finalizado">Finalizado</option>
            </select>
            <select
              value={vencimientoFiltro}
              onChange={(e) => { setVencimientoFiltro(e.target.value); setPage(1); }}
              className="rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Vencimiento: Todos</option>
              <option value="este_mes">Este mes</option>
              <option value="prox_30">Próximos 30 días</option>
              <option value="prox_60">Próximos 60 días</option>
              <option value="vencidos">Vencidos</option>
            </select>
          </div>
        </div>
        <div className="mt-4 text-sm text-slate-500 text-right">{totalResults} resultados</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border-l-4 border-primary bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-primary">
            <FileCheck className="h-5 w-5" />
            <p className="text-sm font-semibold text-slate-900">Contratos Activos</p>
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{activeContratosCount}</p>
          <p className="mt-2 text-sm text-slate-500">contratos vigentes</p>
        </div>
        <div className="rounded-3xl border-l-4 border-success bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-success">
                    <InfinityIcon className="h-5 w-5" />
            <p className="text-sm font-semibold text-slate-900">Indefinidos</p>
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{indefinidosCount}</p>
          <p className="mt-2 text-sm text-slate-500">sin fecha de vencimiento</p>
        </div>
        <div className="rounded-3xl border-l-4 border-warning bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-warning">
            <Clock className="h-5 w-5" />
            <p className="text-sm font-semibold text-slate-900">Plazo Fijo</p>
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{plazoFijoCount}</p>
          <p className="mt-2 text-sm text-slate-500">con fecha de vencimiento</p>
        </div>
        <div className={`rounded-3xl border-l-4 ${porVencerCount > 0 ? 'border-danger bg-red-50' : 'border-success bg-emerald-50'} p-5 shadow-sm`}>
          <div className="flex items-center gap-3 text-slate-900">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-semibold">Por Vencer (30 días)</p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <p className="text-3xl font-semibold text-slate-900">{porVencerCount}</p>
            {porVencerCount > 0 ? (
              <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">Urgente</span>
            ) : (
              <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold text-white">Sin urgencias</span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">requieren atención</p>
        </div>
      </div>

      {contratosQuery.isLoading ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="space-y-3">
            {[...Array(limit || 5)].map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl bg-slate-100 p-4" style={{ minHeight: 72 }} />
            ))}
          </div>
        </div>
      ) : contratosPagina.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <FileX className="mx-auto h-14 w-14 text-slate-400" />
          <p className="mt-6 text-xl font-semibold text-slate-900">No se encontraron contratos</p>
          <p className="mt-2 text-sm text-slate-500">Aún no hay contratos en el sistema con estos filtros.</p>
          <button
            type="button"
            onClick={() => abrirModal('nuevo')}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Crear primer contrato
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['EMPLEADO', 'TIPO', 'SALARIO BASE', 'INICIO', 'FIN', 'ESTADO', 'DÍAS RESTANTES', 'ACCIONES'].map((label) => (
                    <th key={label} className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${label === 'ACCIONES' ? 'sticky right-0 z-20 min-w-[230px] bg-gray-50 shadow-[-4px_0_6px_-6px_rgba(0,0,0,0.35)]' : ''}`}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contratosPagina.map((contrato) => {
                  const isActive = contrato.estado === 'activo';
                  const isPlazoFijo = contrato.tipo_contrato === 'plazo_fijo';
                  const dias = contrato.dias_restantes;
                  const rowClass = dias !== null && dias <= 30 ? 'bg-red-50 border-l-4 border-danger' : dias !== null && dias <= 60 ? 'bg-amber-50 border-l-4 border-warning' : 'bg-transparent';
                  const badgeClasses = {
                    activo: 'bg-emerald-100 text-emerald-700',
                    vencido: 'bg-rose-100 text-danger',
                    rescindido: 'bg-slate-100 text-slate-600',
                    finalizado: 'bg-blue-100 text-primary',
                  };
                  return (
                    <tr key={contrato.id} className={`${rowClass}`}>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                            {contrato.empleado_iniciales}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{contrato.empleado_nombre}</p>
                            <p className="text-xs text-slate-500">CI {contrato.empleado_ci}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isPlazoFijo ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                          {isPlazoFijo ? <Clock className="h-3.5 w-3.5" /> : <InfinityIcon className="h-3.5 w-3.5" />}
                          {contrato.tipo_contrato === 'indefinido' ? 'Indefinido' : 'Plazo Fijo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-sm font-semibold text-slate-900">{formatMoneda(Number(contrato.salario_base))}</td>
                      <td className="px-6 py-4 align-top text-sm text-slate-500">{formatFecha(contrato.fecha_inicio)}</td>
                      <td className="px-6 py-4 align-top text-sm text-slate-500">{contrato.fecha_fin ? formatFecha(contrato.fecha_fin) : '—'}</td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses[contrato.estado] || 'bg-slate-100 text-slate-600'}`}>
                          {contrato.estado.charAt(0).toUpperCase() + contrato.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-900">
                        {contrato.dias_restantes === null
                          ? '—'
                          : contrato.dias_restantes <= 0
                          ? <span className="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-danger">Vencido</span>
                          : contrato.dias_restantes <= 30
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-danger">{contrato.dias_restantes} días</span>
                          : contrato.dias_restantes <= 60
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-warning">{contrato.dias_restantes} días</span>
                          : <span className="text-sm font-semibold text-success">{contrato.dias_restantes} días</span>
                        }
                      </td>
                      <td className={`sticky right-0 z-10 min-w-[230px] px-6 py-4 align-top shadow-[-4px_0_6px_-6px_rgba(0,0,0,0.35)] ${dias !== null && dias <= 30 ? 'bg-red-50' : dias !== null && dias <= 60 ? 'bg-amber-50' : 'bg-white'}`}>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => abrirModal('detalle', contrato)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {isActive && isPlazoFijo && (
                            <>
                              <button
                                type="button"
                                onClick={() => abrirModal('renovar', contrato)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                title="Renovar"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirModal('detalle', contrato)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirModal('rescindir', contrato)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-danger hover:bg-rose-200"
                                title="Rescindir"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {isActive && !isPlazoFijo && (
                            <>
                              <button
                                type="button"
                                onClick={() => abrirModal('detalle', contrato)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirModal('finalizar', contrato)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200"
                                title="Finalizar"
                              >
                                <CheckSquare className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirModal('rescindir', contrato)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-danger hover:bg-rose-200"
                                title="Rescindir"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {!isActive && (
                            <>
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed"
                                title="Editar no disponible"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed"
                                title="Renovar/Finalizar no disponible"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Página {currentPage} de {pageCount} · {totalResults} registros</p>
            <div className="flex items-center gap-3">
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="rounded-2xl border border-gray-200 bg-white py-2 px-3 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {[25, 50, 100].map((value) => (
                  <option key={value} value={value}>{value} filas</option>
                ))}
              </select>
              <div className="inline-flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >Anterior</button>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pageCount}
                  className="border-l border-gray-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <NuevoContratoModal
        isOpen={modalActivo === 'nuevo'}
        onClose={cerrarModal}
        onSuccess={() => contratosQuery.refetch()}
      />
      <DetalleContratoModal
        isOpen={modalActivo === 'detalle'}
        contratoId={contratoSeleccionado?.id}
        onClose={cerrarModal}
      />
      <RenovarContratoModal
        isOpen={modalActivo === 'renovar'}
        contrato={contratoSeleccionado}
        onClose={cerrarModal}
        onSuccess={() => contratosQuery.refetch()}
      />
      <RescindirContratoModal
        isOpen={modalActivo === 'rescindir'}
        contrato={contratoSeleccionado}
        onClose={cerrarModal}
        onSuccess={() => contratosQuery.refetch()}
      />
      <FinalizarContratoModal
        isOpen={modalActivo === 'finalizar'}
        contrato={contratoSeleccionado}
        onClose={cerrarModal}
        onSuccess={() => contratosQuery.refetch()}
      />
    </div>
  );
};

export default Contratos;
