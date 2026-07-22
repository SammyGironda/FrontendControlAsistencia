import React, { useState, useMemo, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Search, ChevronDown, Upload, Paperclip, LogIn, LogOut } from 'lucide-react';
import Header from '../../components/layout/Header';
import { getIncidenciasPendientes, resolverIncidencia } from '../../api/marcaciones';
import useAuthStore from '../../store/authStore';

// Mock data - Remplazar con llamada a la API
const mockIncidencias = [
  { id: 1, empleado: { nombre: 'Ana García', iniciales: 'AG', ci: '1234567 LP' }, fecha: '2026-05-28', tipo: 'huerfana', detalle: 'Entrada 08:03 — sin salida registrada', estado: 'pendiente', marcaciones: [{hora: '08:03', tipo: 'ENTRADA', origen: 'Biométrico'}] },
  { id: 2, empleado: { nombre: 'Juan Pérez', iniciales: 'JP', ci: '7654321 CB' }, fecha: '2026-05-28', tipo: 'duplicada', detalle: 'Dos entradas: 07:58 y 08:01', estado: 'pendiente', marcaciones: [{hora: '07:58', tipo: 'ENTRADA', origen: 'Excel'}, {hora: '08:01', tipo: 'ENTRADA', origen: 'Excel'}] },
  { id: 3, empleado: { nombre: 'María Rodriguez', iniciales: 'MR', ci: '8901234 SC' }, fecha: '2026-05-27', tipo: 'inconsistente', detalle: 'Salida (07:45) antes que entrada (08:03)', estado: 'pendiente', marcaciones: [{hora: '08:03', tipo: 'ENTRADA', origen: 'Biométrico'}, {hora: '07:45', tipo: 'SALIDA', origen: 'Biométrico'}] },
  { id: 4, empleado: { nombre: 'Carlos López', iniciales: 'CL', ci: '4567890 OR' }, fecha: '2026-05-26', tipo: 'huerfana', detalle: 'Salida 18:30 — sin entrada registrada', estado: 'resuelta', marcaciones: [{hora: '18:30', tipo: 'SALIDA', origen: 'Excel'}] },
  { id: 5, empleado: { nombre: 'Laura Fernandez', iniciales: 'LF', ci: '2345678 PT' }, fecha: '2026-05-25', tipo: 'duplicada', detalle: 'Dos salidas: 18:05 y 18:07', estado: 'ignorada', marcaciones: [{hora: '18:05', tipo: 'SALIDA', origen: 'Biométrico'}, {hora: '18:07', tipo: 'SALIDA', origen: 'Biométrico'}] },
];

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

const ResolucionIncidencias = () => {
  const [filters, setFilters] = useState({ tipo: 'todos', estado: 'pendiente', search: '' });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedIncidencia, setSelectedIncidencia] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('');
  const [file, setFile] = useState(null);
  const [incidencias, setIncidencias] = useState([]);
  const [observacion, setObservacion] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState({ hora: '', tipo: 'ENTRADA' });
  const { user } = useAuthStore();

  const normalizeEstado = (estado) => {
    if (!estado) return 'pendiente';
    if (estado === 'resuelta') return 'resuelto';
    if (estado === 'ignorada') return 'ignorado';
    return estado;
  };

  const filteredData = useMemo(() => {
    return incidencias.filter((item) => {
      const searchLower = (filters.search || '').toLowerCase();
      const tipo = item.tipo || item.tipo_incidencia || 'otros';
      const estado = normalizeEstado(item.estado || item.estado_resolucion || 'pendiente');
      const nombre = (item.empleado && item.empleado.nombre) || item.nombre || `Marcación ${item.id_marcacion ?? item.id}`;
      const ci = (item.empleado && item.empleado.ci) || item.ci || '';
      return (
        (filters.tipo === 'todos' || tipo === filters.tipo) &&
        (filters.estado === 'todos' || estado === filters.estado) &&
        (nombre.toLowerCase().includes(searchLower) || ci.toLowerCase().includes(searchLower))
      );
    });
  }, [filters, incidencias]);

  const pendientesCount = incidencias.filter(i => normalizeEstado(i.estado || i.estado_resolucion) === 'pendiente').length;

  useEffect(() => {
    fetchIncidencias();
  }, []);

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
    } catch (err) {
      console.error(err);
    }
  };

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
    };

    try {
      await resolverIncidencia(selectedIncidencia.id, payload);
      await fetchIncidencias();
      closePanel();
    } catch (err) {
      console.error(err);
    }
  };

  const renderResolutionOptions = () => {
    if (!selectedIncidencia) return null;

    switch (selectedIncidencia.tipo) {
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
    <>
      <Header title="Resolución de Incidencias" subtitle="Marcaciones con conflictos pendientes de revisión">
        {pendientesCount > 0 && (
          <div className="flex items-center gap-2 text-red-600 bg-red-100 rounded-full px-3 py-1 text-sm font-semibold">
            <AlertCircle size={16} />
            {pendientesCount} Pendientes
          </div>
        )}
      </Header>

      <div className="px-6 pb-10">
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CI</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalle</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.id} style={{ backgroundColor: getRowBgColor(item.tipo) }}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-600">{item.empleado?.iniciales ?? '—'}</span>
                      </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{item.empleado?.nombre ?? item.nombre ?? `Marcación ${item.id_marcacion ?? item.id}`}</div>
                          </div>
                    </div>
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.empleado?.ci ?? item.ci ?? '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.created_at || item.fecha || Date.now()).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" style={{ backgroundColor: tipoIncidenciaConfig[item.tipo_incidencia ?? item.tipo]?.bg ?? '#FFF5F5', color: tipoIncidenciaConfig[item.tipo_incidencia ?? item.tipo]?.text ?? '#000', border: `1px solid ${tipoIncidenciaConfig[item.tipo_incidencia ?? item.tipo]?.border ?? '#EEE'}` }}>
                          {tipoIncidenciaConfig[item.tipo_incidencia ?? item.tipo]?.label ?? (item.tipo_incidencia ?? item.tipo)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic" style={{color: '#4A5568'}}>{item.detalle ?? item.descripcion_resolucion ?? '—'}</td>
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
                        <button className="text-gray-400 hover:text-gray-600">
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
                  <p><strong>Empleado:</strong> {selectedIncidencia?.empleado?.nombre ?? selectedIncidencia?.nombre ?? '—'} ({selectedIncidencia?.empleado?.ci ?? selectedIncidencia?.ci ?? '—'})</p>
                  <p><strong>Fecha:</strong> {new Date(selectedIncidencia?.created_at || selectedIncidencia?.fecha || Date.now()).toLocaleDateString()}</p>
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
                            {m.tipo === 'ENTRADA' ? <LogIn size={14} className="text-green-500"/> : <LogOut size={14} className="text-red-500"/>}
                            <span>{m.hora}</span>
                            <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{m.origen}</span>
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
    </>
  );
};

export default ResolucionIncidencias;
