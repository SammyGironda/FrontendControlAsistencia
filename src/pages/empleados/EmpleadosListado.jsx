import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useEmpleados } from '../../hooks/useEmpleados';
import DataTable from '../../components/common/DataTable';
import EstadoBadge from '../../components/common/EstadoBadge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from "date-fns/locale/es";
import { Clock, Edit, Trash2, Plus, Search, UserCheck, UserX, PauseCircle, RefreshCw, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { activarEmpleado, rehabilitarEmpleado, suspenderEmpleado, darBajaEmpleado } from '../../api/empleados';
import { toast } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import AsignarHorarioDrawer from './AsignarHorarioDrawer';

const getInitials = (name = '') => {
    if (!name) return '';
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('');
  };

const EmpleadosListado = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ id_departamento: '', id_cargo: '', estado: '' });

  const { data, isLoading, error, refetch } = useEmpleados({
    page,
    limit,
    search,
    ...filters,
  });

  const [empleadoParaAsignar, setEmpleadoParaAsignar] = useState(null);
  const [isAsignarDrawerOpen, setIsAsignarDrawerOpen] = useState(false);

  const empleados = Array.isArray(data) ? data : [];
  const queryClient = useQueryClient();
  const [modalActivo, setModalActivo] = useState(null);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

  const abrirAccion = (tipo, empleado) => {
    setEmpleadoSeleccionado(empleado);
    setModalActivo(tipo);
  };

  const cerrarModal = () => {
    setModalActivo(null);
    setEmpleadoSeleccionado(null);
  };

  const handleMutationError = (error, mensajeFallback) => {
    const msg = error?.response?.data?.detail || error?.message || mensajeFallback;
    toast.error(msg);
  };

  const activarMutation = useMutation({
    mutationFn: (id) => activarEmpleado(id),
    onSuccess: (data) => {
      toast.success(`Empleado ${data.nombres} activado correctamente`);
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      refetch();
      cerrarModal();
    },
    onError: (error) => handleMutationError(error, 'Error al activar empleado'),
  });

  const rehabilitarMutation = useMutation({
    mutationFn: (id) => rehabilitarEmpleado(id),
    onSuccess: (data) => {
      toast.success(`Empleado ${data.nombres} re-habilitado. Recuerda activarlo para que pueda operar.`);
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      refetch();
      cerrarModal();
    },
    onError: (error) => handleMutationError(error, 'Error al re-habilitar empleado'),
  });

  const suspenderMutation = useMutation({
    mutationFn: ({ id, motivo }) => suspenderEmpleado(id, { motivo }),
    onSuccess: (data) => {
      toast.success(`Empleado ${data.nombres} suspendido correctamente`);
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      refetch();
      cerrarModal();
    },
    onError: (error) => handleMutationError(error, 'Error al suspender empleado'),
  });

  const darBajaMutation = useMutation({
    mutationFn: ({ id, motivo }) => darBajaEmpleado(id, { motivo }),
    onSuccess: (data) => {
      toast.success(`Empleado ${data.nombres} dado de baja correctamente`);
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      refetch();
      cerrarModal();
    },
    onError: (error) => handleMutationError(error, 'Error al dar de baja al empleado'),
  });

  const empleadosVisibles = useMemo(() => {
    const termino = search.trim().toLowerCase();

    return empleados.filter((empleado) => {
      const coincideTexto = !termino || [
        empleado.nombres,
        empleado.apellidos,
        empleado.ci_numero,
        empleado.complemento_dep,
        empleado.ci_sufijo_homonimo,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termino));

      return coincideTexto;
    });
  }, [empleados, search]);

  const handlePageChange = (pagination) => {
    setPage(pagination.page);
    setLimit(pagination.limit);
  };

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  }

  const columns = useMemo(
    () => [
      {
        Header: 'EMPLEADO',
        accessor: 'nombres',
        Cell: ({ row }) => (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                {getInitials(`${row.original.nombres} ${row.original.apellidos}`)}
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">{`${row.original.nombres} ${row.original.apellidos}`}</div>
              <div className="text-sm text-gray-500">{row.original.email}</div>
            </div>
          </div>
        ),
      },
      {
        Header: 'CI',
        accessor: 'ci_numero',
        Cell: ({ value, row }) => (
          <span>
            {value}
            {row.original.complemento_dep ? `-${row.original.complemento_dep}` : ''}
            {row.original.ci_sufijo_homonimo ? `-${row.original.ci_sufijo_homonimo}` : ''}
          </span>
        ),
      },
      {
        Header: 'CARGO ID',
        accessor: 'id_cargo',
        Cell: ({ value }) => <span className="text-sm text-gray-700">{value}</span>
      },
      {
        Header: 'DEPARTAMENTO ID',
        accessor: 'id_departamento',
        Cell: ({ value }) => <span className="text-sm text-gray-700">{value}</span>
      },
      {
        Header: 'FECHA INGRESO',
        accessor: 'fecha_ingreso',
        Cell: ({ value }) => (
            <div>
                <div className="text-sm">{format(new Date(value), 'dd/MM/yyyy')}</div>
                <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(value), { locale: es, addSuffix: false })}
                </div>
            </div>
        ),
      },
      {
        Header: 'ESTADO',
        accessor: 'estado',
        Cell: ({ value }) => <EstadoBadge estado={value} />,
      },
      {
        id: 'acciones',
        Header: 'ACCIONES',
        Cell: ({ row }) => {
          const empleado = row.original;
          const estado = empleado.estado;

          const actionButton = ({ onClick, label, Icon, colorClass, hoverClass, disabled = false }) => (
            <button
              type="button"
              onClick={disabled ? undefined : onClick}
              className={`inline-flex items-center justify-center rounded-full p-2 transition-colors duration-150 ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${colorClass} ${!disabled ? hoverClass : ''}`}
              data-tooltip-id="actions-tooltip"
              data-tooltip-content={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );

          const asignarHorario = () => {
            setEmpleadoParaAsignar({
              id: empleado.id,
              nombre: empleado.nombres,
              apellidos: empleado.apellidos,
              cargo: empleado.id_cargo,
              departamento: empleado.id_departamento,
            });
            setIsAsignarDrawerOpen(true);
          };

          const editarEmpleado = () => navigate(`/empleados/editar/${empleado.id}`);

          return (
            <div className="flex items-center space-x-2">
              {estado === 'activo' && (
                <>
                  {actionButton({
                    onClick: asignarHorario,
                    label: 'Asignar horario',
                    Icon: Clock,
                    colorClass: 'text-[#03178C]',
                    hoverClass: 'hover:bg-[#E8F0FF]',
                  })}
                  {actionButton({
                    onClick: editarEmpleado,
                    label: 'Editar',
                    Icon: Edit,
                    colorClass: 'text-gray-400',
                    hoverClass: 'hover:bg-gray-100',
                  })}
                  {actionButton({
                    onClick: () => abrirAccion('suspender', empleado),
                    label: 'Suspender empleado',
                    Icon: PauseCircle,
                    colorClass: 'text-[#D97706]',
                    hoverClass: 'hover:bg-[#FEF3C7]',
                  })}
                  {actionButton({
                    onClick: () => abrirAccion('baja', empleado),
                    label: 'Dar de baja',
                    Icon: UserX,
                    colorClass: 'text-[#731B07]',
                    hoverClass: 'hover:bg-[#FEE2E2]',
                  })}
                </>
              )}

              {estado === 'por_habilitar' && (
                <>
                  {actionButton({
                    onClick: () => abrirAccion('activar', empleado),
                    label: 'Activar empleado',
                    Icon: UserCheck,
                    colorClass: 'text-[#376644]',
                    hoverClass: 'hover:bg-[#DCFCE7]',
                  })}
                  {actionButton({
                    onClick: editarEmpleado,
                    label: 'Editar',
                    Icon: Edit,
                    colorClass: 'text-gray-400',
                    hoverClass: 'hover:bg-gray-100',
                  })}
                  {actionButton({
                    onClick: undefined,
                    label: 'Eliminar no disponible',
                    Icon: Trash2,
                    colorClass: 'text-red-600',
                    hoverClass: 'hover:bg-[#FEE2E2]',
                    disabled: true,
                  })}
                </>
              )}

              {estado === 'suspendido' && (
                <>
                  {actionButton({
                    onClick: () => abrirAccion('activar', empleado),
                    label: 'Reactivar empleado',
                    Icon: UserCheck,
                    colorClass: 'text-[#376644]',
                    hoverClass: 'hover:bg-[#DCFCE7]',
                  })}
                  {actionButton({
                    onClick: editarEmpleado,
                    label: 'Editar',
                    Icon: Edit,
                    colorClass: 'text-gray-400',
                    hoverClass: 'hover:bg-gray-100',
                  })}
                  {actionButton({
                    onClick: () => abrirAccion('baja', empleado),
                    label: 'Dar de baja',
                    Icon: UserX,
                    colorClass: 'text-[#731B07]',
                    hoverClass: 'hover:bg-[#FEE2E2]',
                  })}
                </>
              )}

              {estado === 'baja' && (
                <>
                  {actionButton({
                    onClick: () => abrirAccion('rehabilitar', empleado),
                    label: 'Re-habilitar para gestión',
                    Icon: RefreshCw,
                    colorClass: 'text-[#03178C]',
                    hoverClass: 'hover:bg-[#E8F0FF]',
                  })}
                  {actionButton({
                    onClick: undefined,
                    label: 'Asignar horario no disponible',
                    Icon: Clock,
                    colorClass: 'text-gray-400',
                    hoverClass: 'hover:bg-gray-100',
                    disabled: true,
                  })}
                  {actionButton({
                    onClick: undefined,
                    label: 'Editar no disponible',
                    Icon: Edit,
                    colorClass: 'text-gray-400',
                    hoverClass: 'hover:bg-gray-100',
                    disabled: true,
                  })}
                  {actionButton({
                    onClick: undefined,
                    label: 'Suspender no disponible',
                    Icon: PauseCircle,
                    colorClass: 'text-gray-400',
                    hoverClass: 'hover:bg-gray-100',
                    disabled: true,
                  })}
                </>
              )}
            </div>
          );
        },
      },
    ],
    [navigate]
  );

  const activeCount = empleadosVisibles.filter((empleado) => empleado.estado === 'activo').length;
  const inactiveCount = empleadosVisibles.length - activeCount;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Empleados</h1>
            <p className="text-sm text-gray-500 mt-1">
                {activeCount} empleados activos - {inactiveCount} inactivos
            </p>
        </div>
        <Link
          to="/empleados/nuevo"
          className="mt-4 sm:mt-0 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Nuevo Empleado
        </Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por nombre o CI..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
              <div className="lg:col-span-3 relative">
                <input
                  type="number"
                  name="id_departamento"
                  value={filters.id_departamento}
                  onChange={handleFilterChange}
                  placeholder="ID Departamento"
                  className="appearance-none bg-transparent border-gray-300 rounded-md w-full py-2 pl-3 pr-10 text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div className="lg:col-span-3 relative">
                <input
                  type="number"
                  name="id_cargo"
                  value={filters.id_cargo}
                  onChange={handleFilterChange}
                  placeholder="ID Cargo"
                  className="appearance-none bg-transparent border-gray-300 rounded-md w-full py-2 pl-3 pr-10 text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="lg:col-span-1 relative">
                <select name="estado" value={filters.estado} onChange={handleFilterChange} className="appearance-none bg-transparent border-gray-300 rounded-md w-full py-2 pl-3 pr-10 text-gray-700 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Todos los estados</option>
                  <option value="activo">Activo</option>
                  <option value="baja">Baja</option>
                  <option value="suspendido">Suspendido</option>
                  <option value="por_habilitar">Por habilitar</option>
                </select>
            </div>
              <div className="lg:col-span-1 text-sm text-gray-500 text-right">
                {empleadosVisibles.length} resultados
              </div>
        </div>
      </div>

      <DataTable
        columns={columns}
            data={empleadosVisibles}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        pagination={{
          page,
          limit,
              total: empleadosVisibles.length,
        }}
        onPageChange={handlePageChange}
      />

      <ActivarEmpleadoModal
        empleado={empleadoSeleccionado}
        isOpen={modalActivo === 'activar'}
        onClose={cerrarModal}
        onConfirm={() => empleadoSeleccionado?.id && activarMutation.mutate(empleadoSeleccionado.id)}
        loading={activarMutation.isLoading}
      />
      <RehabilitarEmpleadoModal
        empleado={empleadoSeleccionado}
        isOpen={modalActivo === 'rehabilitar'}
        onClose={cerrarModal}
        onConfirm={() => rehabilitarMutation.mutate(empleadoSeleccionado?.id)}
        loading={rehabilitarMutation.isLoading}
      />
      <SuspenderEmpleadoModal
        empleado={empleadoSeleccionado}
        isOpen={modalActivo === 'suspender'}
        onClose={cerrarModal}
        onConfirm={(motivo) => suspenderMutation.mutate({ id: empleadoSeleccionado?.id, motivo })}
        loading={suspenderMutation.isLoading}
      />
      <DarBajaEmpleadoModal
        empleado={empleadoSeleccionado}
        isOpen={modalActivo === 'baja'}
        onClose={cerrarModal}
        onConfirm={(motivo) => darBajaMutation.mutate({ id: empleadoSeleccionado?.id, motivo })}
        loading={darBajaMutation.isLoading}
      />

      <Tooltip id="actions-tooltip" />
      <AsignarHorarioDrawer
        empleado={empleadoParaAsignar}
        isOpen={isAsignarDrawerOpen}
        onClose={() => setIsAsignarDrawerOpen(false)}
        onAsignacionExitosa={refetch}
      />
    </div>
  );
};

const EmpleadoResumenCard = ({ empleado, badgeText, badgeStyle }) => {
  if (!empleado) return null;

  const ciCompleto = [empleado.ci_numero, empleado.complemento_dep, empleado.ci_sufijo_homonimo]
    .filter(Boolean)
    .join('-');

  return (
    <div className="rounded-lg bg-[#F7FAFC] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-900">
          {getInitials(`${empleado.nombres} ${empleado.apellidos}`)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{`${empleado.nombres} ${empleado.apellidos}`}</p>
          <p className="text-sm text-slate-500">{ciCompleto}</p>
          <p className="text-sm text-slate-500">{`Cargo ${empleado.id_cargo} · Departamento ${empleado.id_departamento}`}</p>
        </div>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: badgeStyle?.bg,
            color: badgeStyle?.text,
            border: `1px solid ${badgeStyle?.border}`,
          }}
        >
          {badgeText}
        </span>
      </div>
    </div>
  );
};

const ModalShell = ({ isOpen, icon, iconBg, title, subtitle, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[440px] rounded-[12px] bg-white p-7 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}>
            {icon}
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="mt-6">{children}</div>

        <div className="mt-6 flex justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
};

const ActivarEmpleadoModal = ({ empleado, isOpen, onClose, onConfirm, loading }) => {
  return (
    <ModalShell
      isOpen={isOpen}
      icon={<UserCheck className="w-6 h-6 text-[#376644]" />}
      iconBg="bg-[#F0FFF4]"
      title="Activar Empleado"
      subtitle="Este empleado fue creado y está pendiente de activación"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center rounded-md bg-[#376644] px-4 py-2 text-sm font-medium text-white transition ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#2d593b]'}`}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-3.5 w-3.5" />}
            Activar Empleado
          </button>
        </>
      }
    >
      <EmpleadoResumenCard
        empleado={empleado}
        badgeText="Por habilitar"
        badgeStyle={{ bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' }}
      />
      <div className="mt-4 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-sm text-[#92400E]">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5" />
          <p>
            Al activar este empleado podrá ser asignado a turnos, registrar marcaciones y aparecer en los reportes de asistencia.
          </p>
        </div>
      </div>
    </ModalShell>
  );
};

const RehabilitarEmpleadoModal = ({ empleado, isOpen, onClose, onConfirm, loading }) => {
  return (
    <ModalShell
      isOpen={isOpen}
      icon={<RefreshCw className="w-6 h-6 text-[#03178C]" />}
      iconBg="bg-[#EBF4FF]"
      title="Re-habilitar Empleado"
      subtitle="Este empleado está dado de baja. Puedes re-habilitarlo para volver a gestionarlo."
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center rounded-md bg-[#03178C] px-4 py-2 text-sm font-medium text-white transition ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#021266]'}`}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            Re-habilitar
          </button>
        </>
      }
    >
      <EmpleadoResumenCard
        empleado={empleado}
        badgeText="Baja"
        badgeStyle={{ bg: '#F7FAFC', text: '#777F8F', border: '#E2E8F0' }}
      />
      <div className="mt-4 rounded-lg border border-[#FECACA] bg-[#FFF5F5] p-3 text-sm text-[#7F1D1D]">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <p>
            Al re-habilitar, el empleado quedará en estado 'Por habilitar' y necesitará ser activado manualmente. Sus registros históricos de asistencia se conservan.
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-[#BEE3F8] bg-[#EBF4FF] p-3 text-sm text-[#1E40AF]">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5" />
          <p>
            Esta acción NO restaura automáticamente el acceso al sistema. Deberás activar al empleado después.
          </p>
        </div>
      </div>
    </ModalShell>
  );
};

const SuspenderEmpleadoModal = ({ empleado, isOpen, onClose, onConfirm, loading }) => {
  const [motivo, setMotivo] = useState('');
  const motivoValido = motivo.trim().length >= 10;

  useEffect(() => {
    if (isOpen) {
      setMotivo('');
    }
  }, [isOpen, empleado?.id]);

  return (
    <ModalShell
      isOpen={isOpen}
      icon={<PauseCircle className="w-6 h-6 text-[#D97706]" />}
      iconBg="bg-[#FFFBEB]"
      title="Suspender Empleado"
      subtitle="El empleado quedará suspendido temporalmente."
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(motivo)}
            disabled={!motivoValido || loading}
            className={`inline-flex items-center rounded-md bg-[#D97706] px-4 py-2 text-sm font-medium text-white transition ${!motivoValido || loading ? 'animate-pulse opacity-70 cursor-not-allowed' : 'hover:bg-[#b45f04]'}`}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PauseCircle className="mr-2 h-3.5 w-3.5" />}
            Suspender
          </button>
        </>
      }
    >
      <EmpleadoResumenCard
        empleado={empleado}
        badgeText="Activo"
        badgeStyle={{ bg: '#F0FFF4', text: '#376644', border: '#C6F6D5' }}
      />
      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700">Motivo de suspensión</label>
        <textarea
          rows={3}
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Ej: Investigación disciplinaria en curso..."
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#FDE68A]"
        />
      </div>
      <div className="mt-4 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-sm text-[#92400E]">
        <p>El empleado no podrá registrar marcaciones ni aparecerá como activo en los reportes. Puede ser reactivado en cualquier momento.</p>
      </div>
    </ModalShell>
  );
};

const DarBajaEmpleadoModal = ({ empleado, isOpen, onClose, onConfirm, loading }) => {
  const [motivo, setMotivo] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const accionValida = motivo.trim().length >= 10 && confirmado;

  useEffect(() => {
    if (isOpen) {
      setMotivo('');
      setConfirmado(false);
    }
  }, [isOpen, empleado?.id]);

  return (
    <ModalShell
      isOpen={isOpen}
      icon={<UserX className="w-6 h-6 text-[#731B07]" />}
      iconBg="bg-[#FFF5F5]"
      title="Dar de Baja al Empleado"
      subtitle="Esta es una acción significativa. El empleado perderá el acceso al sistema."
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(motivo)}
            disabled={!accionValida || loading}
            className={`inline-flex items-center rounded-md bg-[#731B07] px-4 py-2 text-sm font-medium text-white transition ${!accionValida || loading ? 'animate-pulse opacity-70 cursor-not-allowed' : 'hover:bg-[#5a1505]'}`}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-3.5 w-3.5" />}
            Dar de Baja
          </button>
        </>
      }
    >
      <EmpleadoResumenCard
        empleado={empleado}
        badgeText="Activo"
        badgeStyle={{ bg: '#F0FFF4', text: '#376644', border: '#C6F6D5' }}
      />
      <div className="mt-4 rounded-lg border border-[#FECACA] bg-[#FFF5F5] p-4 text-sm text-[#7F1D1D]">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div>
            <p className="font-semibold">Al dar de baja a este empleado:</p>
            <ul className="mt-2 space-y-2 list-disc pl-5 text-sm">
              <li>No podrá acceder al sistema</li>
              <li>No aparecerá en reportes activos</li>
              <li>Sus registros históricos se conservan</li>
              <li>Puede ser re-habilitado posteriormente si es necesario</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700">Motivo de baja</label>
        <textarea
          rows={3}
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Ej: Renuncia voluntaria / Fin de contrato..."
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#731B07] focus:outline-none focus:ring-2 focus:ring-[#FECACA]"
        />
      </div>
      <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={confirmado}
          onChange={(event) => setConfirmado(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-[#731B07] focus:ring-[#FECACA]"
        />
        {`Confirmo que deseo dar de baja a ${empleado?.nombres ?? ''} ${empleado?.apellidos ?? ''}`}
      </label>
    </ModalShell>
  );
};

export default EmpleadosListado;
