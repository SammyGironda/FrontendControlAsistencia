import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Copy, Database, FileSpreadsheet, Loader2, Upload, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Header from '../../components/layout/Header';
import {
  subirExcel,
  crearMarcacion,
  getMarcacionesHuerfanas,
  getMarcacionesDuplicadas,
  getArchivos,
} from '../../api/marcaciones';
import useAuthStore from '../../store/authStore';

const mockValidation = {
  totalFilas: 120,
  correctas: 95,
  advertencias: 15,
  errores: 10,
  erroresCriticos: [
    { id: 1, fila: 12, error: 'CI no encontrado', valor: '3456678-OR' },
    { id: 2, fila: 28, error: 'Fecha invalida', valor: '32/04/2026' },
    { id: 3, fila: 61, error: 'Hora entrada invalida', valor: '8.75' },
  ],
  huerfanas: [
    { id: 1, empleado: 'Ana Maria', ci: '7823456 LP', fecha: '08/04/2026', hora: '08:05', tipo: 'ENTRADA', tipoFaltante: 'SALIDA' },
    { id: 2, empleado: 'Luis Mateo', ci: '7342211 CB', fecha: '11/04/2026', hora: '17:02', tipo: 'SALIDA', tipoFaltante: 'ENTRADA' },
  ],
  duplicados: [
    { id: 1, empleado: 'Sofia Rojas', fecha: '03/04/2026', marcacion1: '08:00', marcacion2: '08:03' },
    { id: 2, empleado: 'Daniel Perez', fecha: '05/04/2026', marcacion1: '17:01', marcacion2: '17:04' },
  ],
};

const formatFileSize = (size) => {
  if (!size && size !== 0) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const IngestaExcel = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [viewState, setViewState] = useState('idle');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [validationData, setValidationData] = useState(mockValidation);
  const [orphanRows, setOrphanRows] = useState(mockValidation.huerfanas);
  const [duplicateRows, setDuplicateRows] = useState(mockValidation.duplicados);
  const [archivos, setArchivos] = useState([]);
  const [openSections, setOpenSections] = useState({
    errores: true,
    huerfanas: false,
    duplicados: false,
  });
  const [manualModal, setManualModal] = useState({ open: false, row: null, hora: '' });
  const [isImporting, setIsImporting] = useState(false);
  const { user } = useAuthStore();

  const resumenTexto = useMemo(() => {
    const { totalFilas, correctas, advertencias, errores } = validationData;
    return `Se procesaron ${totalFilas} filas: ${correctas} correctas · ${advertencias} advertencias · ${errores} errores`;
  }, [validationData]);

  const handleFileSelect = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setProgress(8);
    setViewState('processing');
    // start upload
    doUpload(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    handleFileSelect(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const handleCancel = () => {
    setViewState('idle');
    setProgress(0);
    setSelectedFile(null);
  };

  const resetAll = () => {
    setViewState('idle');
    setProgress(0);
    setSelectedFile(null);
    setIsImporting(false);
    setValidationData(mockValidation);
    setOrphanRows(mockValidation.huerfanas);
    setDuplicateRows(mockValidation.duplicados);
  };

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openManualModal = (row) => {
    setManualModal({ open: true, row, hora: '' });
  };

  const closeManualModal = () => {
    setManualModal({ open: false, row: null, hora: '' });
  };

  const saveManualTime = () => {
    if (!manualModal.row || !manualModal.hora) return;
    // Call API to create marcacion manual
    const row = manualModal.row;
    const payload = {
      empleado_id: row.empleado_id ?? row.empleado_id ?? row.empleado?.id ?? null,
      fecha: row.fecha,
      hora: manualModal.hora,
      tipo: row.tipoFaltante ?? row.tipo ?? 'ENTRADA',
      origen: 'manual',
    };
    crearMarcacion(payload)
      .then(() => {
        setOrphanRows((prev) => prev.filter((item) => item.id !== row.id));
        toast.success('Marcación creada');
        // refresh archivos and lists
        refreshLists();
      })
      .catch(() => {
        toast.error('Error al crear la marcación');
      });
    closeManualModal();
  };

  const refreshLists = async () => {
    try {
      const [huerfanas, duplicadas, archivosResp] = await Promise.all([
        getMarcacionesHuerfanas(),
        getMarcacionesDuplicadas(),
        getArchivos({ skip: 0, limit: 100 }),
      ]);
      setOrphanRows(
        Array.isArray(huerfanas)
          ? huerfanas
          : Array.isArray(huerfanas.items)
          ? huerfanas.items
          : Array.isArray(huerfanas.value)
          ? huerfanas.value
          : []
      );
      setDuplicateRows(
        Array.isArray(duplicadas)
          ? duplicadas
          : Array.isArray(duplicadas.items)
          ? duplicadas.items
          : Array.isArray(duplicadas.value)
          ? duplicadas.value
          : []
      );
      setArchivos(
        Array.isArray(archivosResp)
          ? archivosResp
          : Array.isArray(archivosResp.items)
          ? archivosResp.items
          : Array.isArray(archivosResp.value)
          ? archivosResp.value
          : []
      );
    } catch (err) {
      console.error(err);
    }
  };

  const doUpload = async (file) => {
    try {
      setIsImporting(true);
      const resp = await subirExcel(file, { id_subido_por: user?.id ?? user?.empleado_id ?? 1 });
      // map UploadExcelResponse
      const errores = resp.errores || resp.filas_con_error || resp.filas_con_errores || resp.errors || [];
      const totalFilas = resp.total_filas ?? resp.filas_procesadas ?? resp.total ?? mockValidation.totalFilas;
      const correctas = resp.correctas ?? resp.filas_correctas ?? 0;
      const advertencias = resp.advertencias ?? 0;
      const erroresCriticos = Array.isArray(errores) ? errores : [];

      setValidationData((prev) => ({
        ...prev,
        totalFilas,
        correctas,
        advertencias,
        errores: erroresCriticos.length,
        erroresCriticos,
      }));

      // fetch lists
      await refreshLists();
      toast.success('Archivo procesado');
      setViewState('validation');
    } catch (err) {
      console.error(err);
      toast.error('Error al subir el archivo');
      setViewState('idle');
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    // load archivos on mount
    refreshLists();
  }, []);

  const handleConfirmImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      setViewState('success');
      toast.success('Importacion completada con exito.');
      setTimeout(() => navigate('/asistencia'), 1400);
    }, 1200);
  };

  useEffect(() => {
    if (viewState !== 'processing') return undefined;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 96) return 96;
        return prev + 6;
      });
    }, 220);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      // state transition handled by doUpload
    }, 1600);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [viewState]);

  const hasCriticalErrors = validationData.erroresCriticos.length > 0;

  return (
    <div className="min-h-full">
      <Header title="Ingesta de Marcaciones" subtitle="Carga y validacion de planillas Excel" />
      <div className="px-6 pb-10">
        <div className="mx-auto w-full max-w-[800px]">
          {viewState === 'idle' && (
            <div className="space-y-6">
              <div
                className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-white px-6 py-10 text-center transition ${
                  dragActive
                    ? 'border-accent bg-amber-50'
                    : 'border-primary hover:bg-primary/5'
                }`}
                style={{ minHeight: 200 }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
              >
                <Upload className="h-12 w-12 text-primary" />
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-gray-800">
                    Arrastra tu planilla de marcaciones aqui
                  </p>
                  <p className="text-sm text-gray-500">
                    o haz clic para buscar en tu computadora
                  </p>
                  <p className="text-xs text-gray-400">Formato: .xlsx · Maximo 10 MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="rounded-lg bg-gray-100 p-4 text-sm text-gray-600">
                El archivo Excel debe tener las columnas: CI | Extension | Fecha | Hora | Tipo
                (ENTRADA/SALIDA)
              </div>
              {/* Historial de archivos */}
              <div className="mt-4 rounded-lg bg-white p-4 border">
                <h4 className="text-sm font-semibold mb-3">Historial de archivos subidos</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-2 py-2">Archivo</th>
                        <th className="px-2 py-2">Fecha</th>
                        <th className="px-2 py-2">Filas</th>
                        <th className="px-2 py-2">Estado</th>
                        <th className="px-2 py-2">Errores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivos.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-2 py-3 text-xs text-gray-500">No hay archivos</td>
                        </tr>
                      )}
                      {archivos.map((a) => {
                        const nombre = a.nombre || a.file_name || a.filename || a.archivo || a.name;
                        const fecha = a.created_at || a.fecha_subida || a.fecha || a.createdAt;
                        const filas = a.filas_procesadas ?? a.total_filas ?? a.filas ?? '—';
                        const estado = a.estado_procesamiento || a.estado || a.status || 'pendiente';
                        const erroresCount = Array.isArray(a.errores) ? a.errores.length : a.errores_count ?? a.errores ?? 0;
                        return (
                          <tr key={a.id || nombre} className="border-t border-gray-100 text-gray-600">
                            <td className="px-2 py-2">{nombre}</td>
                            <td className="px-2 py-2">{fecha ? new Date(fecha).toLocaleString() : '—'}</td>
                            <td className="px-2 py-2">{filas}</td>
                            <td className="px-2 py-2">
                              {estado === 'pendiente' && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">Pendiente</span>}
                              {estado === 'procesando' && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs">Procesando</span>}
                              {estado === 'completado' && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs">Completado</span>}
                              {estado === 'error' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs">Error</span>}
                            </td>
                            <td className="px-2 py-2">{erroresCount}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {viewState === 'processing' && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm font-semibold text-gray-700">
                  Procesando archivo... esto puede tomar unos segundos
                </p>
              </div>
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{selectedFile?.name || 'Planilla.xlsx'}</span>
                  <span>{formatFileSize(selectedFile?.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="mt-4 text-xs font-semibold text-gray-400 hover:text-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {viewState === 'validation' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-semibold text-primary">
                {resumenTexto}
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => toggleSection('errores')}
                    className="flex w-full items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <XCircle className={`h-5 w-5 ${hasCriticalErrors ? 'text-danger' : 'text-success'}`} />
                      <span className="text-sm font-semibold text-gray-700">Errores criticos</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          hasCriticalErrors
                            ? 'bg-red-100 text-danger'
                            : 'bg-green-100 text-success'
                        }`}
                      >
                        {hasCriticalErrors ? validationData.erroresCriticos.length : '0'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{openSections.errores ? 'Ocultar' : 'Ver'}</span>
                  </button>
                  {openSections.errores && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      {!hasCriticalErrors ? (
                        <div className="flex items-center gap-2 text-sm text-success">
                          <CheckCircle className="h-5 w-5" />
                          Sin errores criticos
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="text-[11px] uppercase tracking-wider text-gray-500">
                                <tr>
                                  <th className="px-2 py-2">Fila</th>
                                  <th className="px-2 py-2">Error</th>
                                  <th className="px-2 py-2">Valor recibido</th>
                                </tr>
                              </thead>
                              <tbody>
                                {validationData.erroresCriticos.map((row) => (
                                  <tr key={row.id} className="border-t border-gray-100 text-gray-600">
                                    <td className="px-2 py-2">{row.fila}</td>
                                    <td className="px-2 py-2">{row.error}</td>
                                    <td className="px-2 py-2">{row.valor}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-gray-500">
                            Estos errores bloquean la importacion. Corrige el archivo y vuelve a subirlo.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => toggleSection('huerfanas')}
                    className="flex w-full items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      <span className="text-sm font-semibold text-gray-700">Marcaciones huerfanas</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-warning">
                        {orphanRows.length}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{openSections.huerfanas ? 'Ocultar' : 'Ver'}</span>
                  </button>
                  {openSections.huerfanas && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="text-[11px] uppercase tracking-wider text-gray-500">
                            <tr>
                              <th className="px-2 py-2">Empleado</th>
                              <th className="px-2 py-2">CI</th>
                              <th className="px-2 py-2">Fecha</th>
                              <th className="px-2 py-2">Hora</th>
                              <th className="px-2 py-2">Tipo</th>
                              <th className="px-2 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {orphanRows.map((row) => (
                              <tr key={row.id} className="border-t border-gray-100 text-gray-600">
                                <td className="px-2 py-2 font-medium text-gray-800">{row.empleado}</td>
                                <td className="px-2 py-2">{row.ci}</td>
                                <td className="px-2 py-2">{row.fecha}</td>
                                <td className="px-2 py-2">{row.hora}</td>
                                <td className="px-2 py-2">{row.tipo}</td>
                                <td className="px-2 py-2">
                                  <button
                                    type="button"
                                    onClick={() => openManualModal(row)}
                                    className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300"
                                    disabled={row.resuelta}
                                  >
                                    {row.resuelta ? 'Completado' : 'Completar manualmente'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => toggleSection('duplicados')}
                    className="flex w-full items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Copy className="h-5 w-5 text-amber-500" />
                      <span className="text-sm font-semibold text-gray-700">Duplicados detectados</span>
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-amber-600">
                        {duplicateRows.length}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{openSections.duplicados ? 'Ocultar' : 'Ver'}</span>
                  </button>
                  {openSections.duplicados && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="text-[11px] uppercase tracking-wider text-gray-500">
                            <tr>
                              <th className="px-2 py-2">Empleado</th>
                              <th className="px-2 py-2">Fecha</th>
                              <th className="px-2 py-2">Marcacion 1</th>
                              <th className="px-2 py-2">Marcacion 2</th>
                              <th className="px-2 py-2">Decision</th>
                            </tr>
                          </thead>
                          <tbody>
                            {duplicateRows.map((row) => (
                              <tr key={row.id} className="border-t border-gray-100 text-gray-600">
                                <td className="px-2 py-2 font-medium text-gray-800">{row.empleado}</td>
                                <td className="px-2 py-2">{row.fecha}</td>
                                <td className="px-2 py-2">{row.marcacion1}</td>
                                <td className="px-2 py-2">{row.marcacion2}</td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-3 text-xs text-gray-600">
                                    <label className="flex items-center gap-1">
                                      <input type="radio" name={`dup-${row.id}`} defaultChecked />
                                      Conservar primera
                                    </label>
                                    <label className="flex items-center gap-1">
                                      <input type="radio" name={`dup-${row.id}`} />
                                      Conservar ultima
                                    </label>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <Database className="h-4 w-4" />
                  Origen: Excel
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={resetAll}
                    className="rounded-md border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:border-gray-400"
                  >
                    Subir otro archivo
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={hasCriticalErrors || isImporting}
                    className={`rounded-md px-4 py-2 text-xs font-semibold text-gray-900 transition ${
                      hasCriticalErrors || isImporting
                        ? 'bg-gray-200 text-gray-400'
                        : 'bg-accent hover:bg-accent-hover'
                    }`}
                  >
                    {isImporting ? 'Importando...' : 'Confirmar e Importar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewState === 'success' && (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <CheckCircle className="mx-auto h-16 w-16 text-success" />
              <h2 className="mt-4 text-xl font-bold text-gray-800">Importacion completada</h2>
              <p className="mt-2 text-sm text-gray-500">
                {validationData.correctas} marcaciones importadas correctamente
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/asistencia')}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Ver asistencia
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-md border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600"
                >
                  Importar otro archivo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {manualModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-gray-800">Completar marcacion manualmente</h3>
            <p className="mt-1 text-xs text-gray-500">
              {manualModal.row?.empleado} · Falta {manualModal.row?.tipoFaltante}
            </p>
            <label className="mt-4 block text-xs font-semibold text-gray-500">Hora faltante</label>
            <input
              type="time"
              value={manualModal.hora}
              onChange={(event) => setManualModal((prev) => ({ ...prev, hora: event.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeManualModal}
                className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveManualTime}
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngestaExcel;
