import React, { useState, useMemo } from 'react';
import { useTable, usePagination, useSortBy } from 'react-table';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';

const DataTable = ({
  columns,
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

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page: tablePage,
  } = useTable(
    {
      columns,
      data,
      manualPagination: true,
      pageCount: Math.ceil(total / limit),
      manualSortBy: true,
    },
    useSortBy,
    usePagination
  );

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
          <p className="text-gray-500 mb-4">{error.message || 'No se pudieron cargar los datos.'}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Reintentar
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      {onSearch && (
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full md:w-1/3"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.render('Header')}
                    <span>
                      {column.isSorted
                        ? column.isSortedDesc
                          ? ' 🔽'
                          : ' 🔼'
                        : ''}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200">
            {loading
              ? renderSkeleton()
              : error
              ? renderError()
              : tablePage.length === 0
              ? renderEmpty()
              : tablePage.map(row => {
                  prepareRow(row);
                  return (
                    <tr {...row.getRowProps()} className="hover:bg-gray-50">
                      {row.cells.map(cell => (
                        <td {...cell.getCellProps()} className="px-6 py-4 whitespace-nowrap text-sm">
                          {cell.render('Cell')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Anterior
          </button>
          <button onClick={() => handlePageChange(page + 1)} disabled={page >= Math.ceil(total / limit)} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{(page - 1) * limit + 1}</span> a <span className="font-medium">{Math.min(page * limit, total)}</span> de{' '}
              <span className="font-medium">{total}</span> resultados
            </p>
          </div>
          <div className="flex items-center">
             <select value={limit} onChange={handleLimitChange} className="mx-4 border-gray-300 rounded-md">
                <option value={10}>10 / página</option>
                <option value={25}>25 / página</option>
                <option value={50}>50 / página</option>
                <option value={100}>100 / página</option>
            </select>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                Página {page} de {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= Math.ceil(total / limit)}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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
