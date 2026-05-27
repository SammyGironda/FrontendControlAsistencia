import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEmpleados } from '../../hooks/useEmpleados';
import DataTable from '../../components/common/DataTable';
import EstadoBadge from '../../components/common/EstadoBadge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from "date-fns/locale/es";
import { Eye, Edit, Trash2, Plus, Search, ChevronDown } from 'lucide-react';
import { Tooltip } from 'react-tooltip';

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
  const [filters, setFilters] = useState({ area: '', estado: '' });

  const { data, isLoading, error, refetch } = useEmpleados({ page, limit, search, ...filters });

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
                {getInitials(`${row.original.nombres} ${row.original.apellido_paterno}`)}
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">{`${row.original.nombres} ${row.original.apellido_paterno} ${row.original.apellido_materno || ''}`}</div>
              <div className="text-sm text-gray-500">{row.original.email}</div>
            </div>
          </div>
        ),
      },
      {
        Header: 'CI',
        accessor: 'ci',
        Cell: ({ value, row }) => <span>{value} {row.original.ci_extension}</span>,
      },
      {
        Header: 'CARGO',
        accessor: 'cargo.nombre',
        Cell: ({ value }) => <span className="text-sm text-gray-700">{value || 'No asignado'}</span>
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
        Header: 'VACACIONES',
        accessor: 'dias_vacacion_disponibles',
        Cell: ({ value }) => (
            <div 
                className="font-semibold text-gray-800"
                data-tooltip-id="vacaciones-tooltip"
                data-tooltip-content="Días de vacaciones restantes (Art. 44 LGT)"
            >
                {value} días
            </div>
        ),
      },
      {
        Header: 'ESTADO',
        accessor: 'estado',
        Cell: ({ value }) => <EstadoBadge estado={value} />,
      },
      {
        Header: 'ACCIONES',
        Cell: ({ row }) => (
          <div className="flex items-center space-x-3">
            <button 
                onClick={() => navigate(`/empleados/editar/${row.original.id}`)} 
                className="text-gray-400 hover:text-blue-600"
                data-tooltip-id="actions-tooltip"
                data-tooltip-content="Editar"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button 
                onClick={() => console.log('delete', row.original.id)} 
                className="text-gray-400 hover:text-red-600"
                data-tooltip-id="actions-tooltip"
                data-tooltip-content="Eliminar"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  const activeCount = data?.total_activos || 0;
  const inactiveCount = data?.total_inactivos || 0;

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
                <select name="area" value={filters.area} onChange={handleFilterChange} className="appearance-none bg-transparent border-gray-300 rounded-md w-full py-2 pl-3 pr-10 text-gray-700 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Todas las Áreas</option>
                    {/* Populate with API data */}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <div className="lg:col-span-3 relative">
                <select name="estado" value={filters.estado} onChange={handleFilterChange} className="appearance-none bg-transparent border-gray-300 rounded-md w-full py-2 pl-3 pr-10 text-gray-700 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Todos los estados</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="BAJA">Baja</option>
                    <option value="SUSPENDIDO">Suspendido</option>
                    <option value="INACTIVO">Inactivo</option>
                    <option value="POR HABILITAR">Por Habilitar</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <div className="lg:col-span-1 text-sm text-gray-500 text-right">
                {data?.total || 0} resultados
            </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        pagination={{
          page,
          limit,
          total: data?.total || 0,
        }}
        onPageChange={handlePageChange}
      />
      <Tooltip id="actions-tooltip" />
      <Tooltip id="vacaciones-tooltip" />
    </div>
  );
};

export default EmpleadosListado;
