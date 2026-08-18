import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, XCircle, Search, Paperclip, LogIn, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import { getIncidenciasPendientes, resolverIncidencia } from '../../api/marcaciones';
import { getEmpleado } from '../../api/empleados';
import useAuthStore from '../../store/authStore';

const tipoIncidenciaConfig = {
  huerfana: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', label: 'Huérfana' },
  duplicada: { bg: '#FEFCE8', text: '#CA8A04', border: '#FEF08A', label: 'Duplicada' },
  inconsistente: { bg: '#FFF5F5', text: '#DC2626', border: '#FECACA', label: 'Inconsistente' },
};

const estadoConfig = {
  pendiente: { bg: '#FFF5F5', text: '#731B07', label: 'Pendiente' },
  resuelto: { bg: '#F0FFF4', text: '#376644', label: 'Resuelto' },
  ignorado: { bg: '#F7FAFC', text: '#777F8F', label: 'Ignorado' },
};

const getRowBgColor = (tipo) => {
  if (tipo === 'huerfana') return '#FFFBEB';
  if (tipo === 'duplicada') return '#FEFCE8';
  if (tipo === 'inconsistente') return '#FFF5F5';
  return 'white';
}

const formatIncidenciaFecha = (value) => {
  if (!value) return '—';

  const fecha = new Date(value);
  return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleDateString();
};

const getMarcacionesIncidencia = (incidencia) => (
  Array.isArray(incidencia?.marcaciones) ? incidencia.marcaciones : []
);

const getEmpleadoIdIncidencia = (incidencia) => (
  getMarcacionesIncidencia(incidencia)[0]?.id_empleado ?? null
);

const formatMarcaciones = (incidencia) => {
  const marcaciones = getMarcacionesIncidencia(incidencia);
  if (!marcaciones.length) return '—';

  return marcaciones
    .map((marcacion) => `${marcacion.tipo_marcacion ?? marcacion.tipo ?? 'Marcación'} ${marcacion.hora ?? '—'}`)
    .join(' · ');
};

const ResolucionIncidencias = () => {
  const [filters, setFilters] = useState({ tipo: 'todos', estado: 'pendiente', search: '' });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedIncidencia, setSelectedIncidencia] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('');
  const [file, setFile] = useState(null);
  const [incidencias, setIncidencias] = useState([]);
  const [empleadosPorId, setEmpleadosPorId] = useState({});
  const [observacion, setObservacion] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState({ hora: '', tipo: 'ENTRADA' });
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const normalizeEstado = (estado) => {
    if (!estado) return 'pendiente';
    if (estado === 'resuelta') return 'resuelto';
    if (estado === 'ignorada') return 'ignorado';
    return estado;
  };

  const getEmpleadoIncidencia = (incidencia) => (
    empleadosPorId[getEmpleadoIdIncidencia(incidencia)] ?? null
  );

  const filteredData = useMemo(() => {
    return incidencias.filter((item) => {
      const searchLower = (filters.search || '').toLowerCase();
      const tipo = item.tipo || item.tipo_incidencia || 'otros';
      const estado = normalizeEstado(item.estado || item.estado_resolucion || 'pendiente');
      const empleadoIncidencia = getEmpleadoIncidencia(item);
      const nombreEmpleado = empleadoIncidencia?.nombres || '';
      return (
        (filters.tipo === 'todos' || tipo === filters.tipo) &&
        (filters.estado === 'todos' || estado === filters.estado) &&
        nombreEmpleado.toLowerCase().includes(searchLower)
      );
    });
  }, [filters, incidencias, empleadosPorId]);

  const pendientesCount = incidencias.filter(i => normalizeEstado(i.estado || i.estado_resolucion) === 'pendiente').length;

  const fetchIncidencias = async () => {
    try {
      const resp = await getIncidenciasPendientes();
      // resp may be an array or an object with items or value
      const items = Array.isArray(resp)
        ? resp
        : Array.isArray(resp.items)
        ? resp.items
        : Array.isArray(resp.value)
        ? resp.value
        : [];
      setIncidencias(items);

      const idsEmpleados = [...new Set(
        items.map(getEmpleadoIdIncidencia).filter((id) => Number.isInteger(id))
      )];
      const empleados = await Promise.all(
        idsEmpleados.map(async (id) => [id, await getEmpleado(id)])
      );
      setEmpleadosPorId(Object.fromEntries(empleados));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIncidencias();
  }, []);

  const openPanel = (incidencia) => {
    setSelectedIncidencia(incidencia);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedIncidencia(null);
    setResolutionAction('');
    setFile(null);
    setObservacion('');
    setResolutionDetails({ hora: '', tipo: 'ENTRADA' });
  };
  
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const canConfirmResolution = Boolean(selectedIncidencia && (resolutionAction || observacion || file));

  const handleIgnoreIncidencia = async (incidencia) => {
    if (!incidencia) return;

    try {
      await resolverIncidencia(incidencia.id, {
        estado_resolucion: 'ignorado',
        descripcion_resolucion: 'Incidencia marcada como ignorada desde la acción rápida.',
        evidencia_url: null,
        id_resuelto_por: user?.id ?? 1,
      });
      await fetchIncidencias();
      // Esta pantalla mantiene su propio estado, pero el badge del Sidebar lee
      // el conteo desde React Query: sin esto tardaria hasta un minuto en bajar.
      queryClient.invalidateQueries({ queryKey: ['incidencias'] });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'No se pudo procesar la incidencia.');
    }
  };

  const handleConfirmResolution = async () => {
    if (!selectedIncidencia) return;

    const ignoredActions = ['ignorar', 'ignorar_ambas'];
    const normalizedStatus = ignoredActions.includes(resolutionAction) ? 'ignorado' : 'resuelto';
    const evidenciaUrl = file ? `/docs/evidencias/${encodeURIComponent(file.name)}` : null;
    const payload = {
      estado_resolucion: normalizedStatus,
      descripcion_resolucion: observacion || (resolutionAction ? `Acción: ${resolutionAction}` : 'Resolución registrada'),
      evidencia_url: evidenciaUrl,
      id_resuelto_por: user?.id ?? 1,
      accion_resolucion: resolutionAction || undefined,
      hora_correccion: resolutionDetails.hora || undefined,
      tipo_marcacion_correccion: resolutionDetails.tipo || undefined,
    };

    try {
      await resolverIncidencia(selectedIncidencia.id, payload);
      await fetchIncidencias();
      queryClient.invalidateQueries({ queryKey: ['incidencias'] });
      closePanel();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'No se pudo procesar la incidencia.');
    }
  };

  const renderResolutionOptions = () => {
    if (!selectedIncidencia) return null;

    const tipo = selectedIncidencia.tipo_incidencia ?? selectedIncidencia.tipo;

    switch (tipo) {
      case 'huerfana':
        return (
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-md border has-[:checked]:border-primary has-[:checked]:bg-blue-50">
              <input type="radio" name="resolution" value="completar" onChange={e => setResolutionAction(e.target.value)} className="form-radio text-primary"/>
              <span className="text-sm">Completar manualmente la marcación faltante</span>
            </label>
            {resolutionAction === 'completar' && (
              <div className="pl-8 space-y-2">
                <input
                  type="time"
                  value={resolutionDetails.hora}
                  onChange={(e) => setResolutionDetails((prev) => ({ ...prev, hora: e.target.value }))}
                  className="w-full border-gray-300 rounded-md shadow-sm"
                />
                <select
                  value={resolutionDetails.tipo}
                  onChange={(e) => setResolutionDetails((prev) => ({ ...prev, tipo: e.target.value }))}
                  className="w-full border-gray-300 rounded-md shadow-sm"
                >
                  <option value="ENTRADA">ENTRADA</option>
                  <option value="SALIDA">SALIDA</option>
                </select>
                <p className="text-xs text-gray-500">Se creará una marcación manual.</p>
              </div>
            )}
            <label className="flex items-center gap-3 p-3 rounded-md border has-[:checked]:border-primary has-[:checked]:bg-blue-50">
              <input type="radio" name="resolution" value="incompleto" onChange={e => setResolutionAction(e.target.value)} className="form-radio text-primary"/>
              <span className="text-sm">Marcar como dato incompleto (no afecta asistencia)</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-md border has-[:checked]:border-primary has-[:checked]:bg-blue-50">
              <input type="radio" name="resolution" value="ignorar" onChange={e => setResolutionAction(e.target.value)} className="form-radio text-primary"/>
              <span className="text-sm">Ignorar esta incidencia</span>
            </label>
          </div>
        );
      case 'duplicada':
        return (
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-md border has-[:checked]:border-primary has-[:checked]:bg-blue-50">
              <input type="radio" name="resolution" value="conservar_primera" onChange={e => setResolutionAction(e.target.value)} className="form-radio text-primary"/>
              <span className="text-sm">Conservar la primera marcación ({selectedIncidencia?.marcaciones?.[0]?.hora ?? '—'})</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-md border has-[:checked]:border-primary has-[:checked]:bg-blue-50">
              <input type="radio" name="resolution" value="conservar_ultima" onChange={e => setResolutionAction(e.target.value)} className="form-radio text-primary"/>
              <span className="text-sm">Conservar la última marcación ({selectedIncidencia?.marcaciones?.[1]?.hora ?? '—'})</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-md border has-[:checked]:border-primary has-[:checked]:bg-blue-50">
              <input type="radio" name="resolution" value="ignorar_ambas" onChange={e => setResolutionAction(e.target.value)} className="form-radio text-primary"/>
              <span className="text-sm">Ignorar ambas duplicadas</span>
            </label>
          </div>
        );
      case 'inconsistente':
        return (
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-md border has-[:checked]:border-primary has-[:checked]:bg-blue-50">
              <input type="radio" name="resolution" value="corregir_entrada" onChange={e => setResolutionAction(e.target.value)} className="form-radio text-primary"/>
              <span className="text-sm">Corregir hora de entrada manualmente</span>
            </label>
            {resolutionAction === 'corregir_entrada' && (
              <div className="pl-8">
                <input
                  type="time"
                  value={resolutionDetails.hora}
                  onChange={(e) => setResolutionDetails((prev) => ({ ...prev, hora: e.target.value }))}
                  className="w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
            )}
            
            <label className="flex items-center gap-3 p-3 rounded-md border has-[:checked]:border-primary has-[:checked]:bg-blue-50">
              <input type="radio" name="resolution" value="corregir_salida" onChange={e => setResolutionAction(e.target.value)} className="form-radio text-primary"/>
              <span className="text-sm">Corregir hora de salida manualmente</span>
            </label>
            {resolutionAction === 'corregir_salida' && (
              <div className="pl-8">
                <input
                  type="time"
                  value={resolutionDetails.hora}
                  onChange={(e) => setResolutionDetails((prev) => ({ ...prev, hora: e.target.value }))}
                  className="w-full border-gray-300 rounded-md shadow-sm"
                />
              </div>
            )}

            <label className="flex items-center gap-3 p-3 rounded-md border has-[:checked]:border-primary has-[:checked]:bg-blue-50">
              <input type="radio" name="resolution" value="eliminar_ambas" onChange={e => setResolutionAction(e.target.value)} className="form-radio text-primary"/>
              <span className="text-sm">Eliminar ambas marcaciones del día</span>
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Resolución de Incidencias"
        subtitle="Marcaciones con conflictos pendientes de revisión"
        actions={
          pendientesCount > 0 ? (
            <div className="flex items-center gap-2 text-red-600 bg-red-100 rounded-full px-3 py-1 text-sm font-semibold">
              <AlertCircle size={16} />
              {pendientesCount} Pendientes
            </div>
          ) : null
        }
      />

      <div className="pb-10">
        {/* Barra de Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-gray-500">Tipo</label>
                <select onChange={e => setFilters(f => ({...f, tipo: e.target.value}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
                  <option value="todos">Todos</option>
                  <option value="huerfana">Huérfana</option>
                  <option value="duplicada">Duplicada</option>
                  <option value="inconsistente">Inconsistente</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Estado</label>
                <select onChange={e => setFilters(f => ({...f, estado: e.target.value}))} defaultValue="pendiente" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
                  <option value="pendiente">Pendientes</option>
                  <option value="resuelta">Resueltas</option>
                  <option value="ignorada">Ignoradas</option>
                  <option value="todos">Todos</option>
                </select>
              </div>
              <div className="relative">
                <label className="text-xs text-gray-500">Buscar</label>
                <input
                  type="text"
                  placeholder="Nombre o CI..."
                  onChange={e => setFilters(f => ({...f, search: e.target.value}))}
                  className="mt-1 block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 pt-5 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">{filteredData.length} resultados</div>
          </div>
        </div>

        {/* Tabla de Incidencias */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marcación(es)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.id} style={{ backgroundColor: getRowBgColor(item.tipo) }}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">{item.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-600">{getEmpleadoIncidencia(item)?.nombres?.slice(0, 1)?.toUpperCase() ?? '—'}</span>
                      </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{getEmpleadoIncidencia(item)?.nombres ?? 'Empleado no disponible'}</div>
                          </div>
                    </div>
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatIncidenciaFecha(getMarcacionesIncidencia(item)[0]?.fecha_hora_marcacion || item.created_at || item.fecha)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" style={{ backgroundColor: tipoIncidenciaConfig[item.tipo_incidencia ?? item.tipo]?.bg ?? '#FFF5F5', color: tipoIncidenciaConfig[item.tipo_incidencia ?? item.tipo]?.text ?? '#000', border: `1px solid ${tipoIncidenciaConfig[item.tipo_incidencia ?? item.tipo]?.border ?? '#EEE'}` }}>
                          {tipoIncidenciaConfig[item.tipo_incidencia ?? item.tipo]?.label ?? (item.tipo_incidencia ?? item.tipo)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                        {formatMarcaciones(item)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" style={{ backgroundColor: estadoConfig[normalizeEstado(item.estado_resolucion ?? item.estado)]?.bg ?? '#FFF5F5', color: estadoConfig[normalizeEstado(item.estado_resolucion ?? item.estado)]?.text ?? '#000' }}>
                          {estadoConfig[normalizeEstado(item.estado_resolucion ?? item.estado)]?.label ?? normalizeEstado(item.estado_resolucion ?? item.estado)}
                        </span>
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {(item.estado === 'pendiente' || item.estado_resolucion === 'pendiente') && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => openPanel(item)} className="text-primary hover:text-primary-light">
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => handleIgnoreIncidencia(item)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Marcar como ignorada"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel Lateral de Resolución */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-40">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50" onClick={closePanel}></div>
          
          {/* Contenido del Panel */}
          <div className="relative z-50 bg-white w-[420px] h-full ml-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Resolver Incidencia</h2>
              <button onClick={closePanel}><XCircle className="text-gray-500" /></button>
            </div>

            <div className="flex-grow p-4 overflow-y-auto space-y-6">
              {/* Datos de la Marcación */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold mb-3">Datos de la Marcación</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Empleado:</strong> {getEmpleadoIncidencia(selectedIncidencia)?.nombres ?? 'Empleado no disponible'}</p>
                  <p><strong>Fecha:</strong> {formatIncidenciaFecha(getMarcacionesIncidencia(selectedIncidencia)[0]?.fecha_hora_marcacion || selectedIncidencia?.created_at || selectedIncidencia?.fecha)}</p>
                  <div className="flex items-center gap-2">
                    <strong>Tipo:</strong>
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" style={{ backgroundColor: tipoIncidenciaConfig[selectedIncidencia?.tipo ?? selectedIncidencia?.tipo_incidencia]?.bg ?? '#FFF5F5', color: tipoIncidenciaConfig[selectedIncidencia?.tipo ?? selectedIncidencia?.tipo_incidencia]?.text ?? '#000', border: `1px solid ${tipoIncidenciaConfig[selectedIncidencia?.tipo ?? selectedIncidencia?.tipo_incidencia]?.border ?? '#EEE'}` }}>
                      {tipoIncidenciaConfig[selectedIncidencia?.tipo ?? selectedIncidencia?.tipo_incidencia]?.label ?? (selectedIncidencia?.tipo ?? selectedIncidencia?.tipo_incidencia)}
                    </span>
                  </div>
                  <div>
                    <strong>Marcaciones registradas:</strong>
                    <ul className="mt-1 space-y-1 pl-2">
                      {selectedIncidencia?.marcaciones && Array.isArray(selectedIncidencia.marcaciones) ? (
                        selectedIncidencia.marcaciones.map((m, i) => (
                          <li key={i} className="flex items-center gap-2 text-gray-600">
                            {m.tipo_marcacion === 'ENTRADA' ? <LogIn size={14} className="text-green-500"/> : <LogOut size={14} className="text-red-500"/>}
                            <span>{m.tipo_marcacion} · {m.hora}</span>
                            <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{m.origen_dato}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-600">Sin detalles de marcaciones</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Acción de Resolución */}
              <div>
                <label className="font-semibold text-sm mb-2 block">¿Cómo resolver esta incidencia?</label>
                {renderResolutionOptions()}
              </div>

              {/* Evidencia de Respaldo */}
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Adjuntar evidencia (opcional pero recomendado)</label>
                {!file ? (
                  <div 
                    onClick={() => document.getElementById('file-upload').click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50"
                  >
                    <Paperclip className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-1 text-sm text-gray-600">Arrastra el correo o documento aquí</p>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG · Máx 5MB</p>
                    <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-gray-100 rounded-md text-sm">
                    <span>{file.name}</span>
                    <button onClick={() => setFile(null)}><XCircle size={16} className="text-red-500"/></button>
                  </div>
                )}
              </div>

              {/* Observación */}
              <div>
                <label htmlFor="observacion" className="text-sm text-gray-600 mb-2 block">Nota de resolución (opcional)</label>
                <textarea
                  id="observacion"
                  rows="3"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="Ej: El empleado reportó por correo que el reloj falló..."
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={closePanel} className="px-4 py-2 text-sm font-semibold rounded-md border border-gray-300">Cancelar</button>
              <button onClick={handleConfirmResolution} disabled={!canConfirmResolution} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md disabled:bg-gray-300">Confirmar Resolución</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResolucionIncidencias;
