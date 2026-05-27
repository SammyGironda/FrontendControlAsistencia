import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';

const DataTable = ({
  columns: columnsData,
  data,
  loading,
  pagination,
  onPageChange,
  onSearch,
  error,
  onRetry,
}) => {
  const { page, limit, total } = pagination;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 400);

  React.useEffect(() => {
    if (onSearch) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch]);

  const columns = useMemo(() => {
    return columnsData.map(col => ({
      accessorKey: col.accessor,
      header: col.Header,
      cell: col.Cell ? ({ row }) => col.Cell({ value: row.getValue(col.accessor), row }) : undefined,
    }));
  }, [columnsData]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= Math.ceil(total / limit)) {
      onPageChange({ page: newPage, limit });
    }
  };

  const handleLimitChange = (e) => {
    onPageChange({ page: 1, limit: Number(e.target.value) });
  };

  const renderSkeleton = () => (
    [...Array(5)].map((_, i) => (
      <tr key={i} className="animate-pulse">
        {columns.map((col, j) => (
          <td key={j} className="px-6 py-4 whitespace-nowrap">
            <div className="h-4 bg-gray-200 rounded"></div>
          </td>
        ))}
      </tr>
    ))
  );

  const renderEmpty = () => (
    <tr>
      <td colSpan={columns.length} className="text-center py-12">
        <div className="flex flex-col items-center">
          <Search className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No se encontraron resultados</h3>
          <p className="text-gray-500">Intenta con otros filtros o términos de búsqueda.</p>
        </div>
      </td>
    </tr>
  );

  const renderError = () => (
    <tr>
      <td colSpan={columns.length} className="text-center py-12">
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold text-red-700">Ocurrió un error</h3>
          <p className="text-gray-500 mb-4">{error?.message || 'No se pudieron cargar los datos.'}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Reintentar
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  const rows = table.getRowModel().rows;
  const maxPages = Math.ceil(total / limit);

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading
              ? renderSkeleton()
              : error
              ? renderError()
              : rows.length === 0
              ? renderEmpty()
              : rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= maxPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{(page - 1) * limit + 1}</span> a{' '}
              <span className="font-medium">{Math.min(page * limit, total)}</span> de{' '}
              <span className="font-medium">{total}</span> resultados
            </p>
          </div>
          <div className="flex items-center">
            <select
              value={limit}
              onChange={handleLimitChange}
              className="mx-4 border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value={10}>10 / página</option>
              <option value={25}>25 / página</option>
              <option value={50}>50 / página</option>
              <option value={100}>100 / página</option>
            </select>
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                Página {page} de {maxPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= maxPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
