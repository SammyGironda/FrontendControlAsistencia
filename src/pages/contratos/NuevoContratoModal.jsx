import React, { useEffect, useMemo, useState } from 'react';
import { FilePlus, Infinity, Clock, X, Search, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmpleados } from '../../api/empleados';
import { crearContratoIndefinido, crearContratoPlazoFijo } from '../../api/contratos';
import { formatFecha, formatMoneda } from '../../lib/formatters';
import { toast } from 'react-hot-toast';

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const buildDurationText = (inicio, fin) => {
  if (!inicio || !fin) return '';
  const start = new Date(inicio);
  const end = new Date(fin);
  const diffDays = Math.max(0, Math.round((end - start) / 86400000));
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  if (months > 0 && days > 0) return `${months} mes${months > 1 ? 'es' : ''} ${days} días`;
  if (months > 0) return `${months} mes${months > 1 ? 'es' : ''}`;
  return `${days} día${days !== 1 ? 's' : ''}`;
};

const NuevoContratoModal = ({ isOpen, onClose, onSuccess, empleadoPreseleccionado }) => {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState('indefinido');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpleado, setSelectedEmpleado] = useState(empleadoPreseleccionado || null);
  const [salarioBase, setSalarioBase] = useState('');
  const [fechaInicio, setFechaInicio] = useState(todayInputValue());
  const [fechaFin, setFechaFin] = useState('');
  const [observacion, setObservacion] = useState('');

  const empleadosQuery = useQuery({
    queryKey: ['empleados', 'contrato-search'],
    queryFn: () => getEmpleados({ skip: 0, limit: 500 }),
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
  });

  const crearIndefinidoMutation = useMutation({
    mutationFn: (payload) => crearContratoIndefinido(payload),
    onSuccess: (data) => {
      toast.success(`Contrato creado correctamente para ${selectedEmpleado?.nombres || 'el empleado'}`);
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      if (onSuccess) onSuccess(data);
      handleClose();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || 'Error al crear contrato indefinido');
    },
  });

  const crearPlazoFijoMutation = useMutation({
    mutationFn: (payload) => crearContratoPlazoFijo(payload),
    onSuccess: (data) => {
      toast.success(`Contrato creado correctamente para ${selectedEmpleado?.nombres || 'el empleado'}`);
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      if (onSuccess) onSuccess(data);
      handleClose();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || 'Error al crear contrato a plazo fijo');
    },
  });

  useEffect(() => {
    if (isOpen) {
      setTipo('indefinido');
      setSearchTerm('');
      setSelectedEmpleado(empleadoPreseleccionado || null);
      setSalarioBase('');
      setFechaInicio(todayInputValue());
      setFechaFin('');
      setObservacion('');
    }
  }, [isOpen, empleadoPreseleccionado]);

  const empleadosFiltrados = useMemo(() => {
    const termino = searchTerm.trim().toLowerCase();
    if (!termino || !Array.isArray(empleadosQuery.data)) return empleadosQuery.data || [];

    return empleadosQuery.data.filter((empleado) => {
      const nombreCompleto = `${empleado.nombres || ''} ${empleado.apellidos || ''}`.toLowerCase();
      const ci = `${empleado.ci_numero || ''}`;
      return nombreCompleto.includes(termino) || ci.includes(termino);
    });
  }, [searchTerm, empleadosQuery.data]);

  const diasDuracion = tipo === 'plazo_fijo' && fechaInicio && fechaFin
    ? Math.round((new Date(fechaFin) - new Date(fechaInicio)) / 86400000)
    : null;

  const handleClose = () => {
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedEmpleado?.id && !empleadoPreseleccionado) {
      toast.error('Selecciona un empleado antes de continuar');
      return;
    }

    const payload = {
      id_empleado: selectedEmpleado?.id || empleadoPreseleccionado?.id,
      fecha_inicio: fechaInicio,
      salario_base: Number(salarioBase),
      observacion: observacion || undefined,
    };

    if (!payload.salario_base || payload.salario_base <= 0) {
      toast.error('Ingresa un salario base válido');
      return;
    }

    if (tipo === 'indefinido') {
      crearIndefinidoMutation.mutate(payload);
      return;
    }

    if (tipo === 'plazo_fijo') {
      if (!fechaFin) {
        toast.error('Selecciona la fecha de fin del contrato');
        return;
      }
      if (new Date(fechaFin) <= new Date(fechaInicio)) {
        toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
        return;
      }
      crearPlazoFijoMutation.mutate({ ...payload, fecha_fin: fechaFin });
    }
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-auto my-4 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Nuevo Contrato</h2>
          </div>
          <button type="button" onClick={handleClose} className="text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="overflow-y-auto flex-1 p-5">
            <div>
            <p className="text-sm font-semibold text-slate-900 mb-3">Tipo de contrato</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('indefinido')}
                className={`rounded-2xl border p-4 text-left transition ${tipo === 'indefinido' ? 'border-2 border-success bg-success/10' : 'border-gray-200 bg-white hover:border-slate-400'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Infinity className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Contrato Indefinido</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">Sin fecha de vencimiento. Ajustes salariales por decreto anual.</p>
              </button>
              <button
                type="button"
                onClick={() => setTipo('plazo_fijo')}
                className={`rounded-2xl border p-4 text-left transition ${tipo === 'plazo_fijo' ? 'border-2 border-warning bg-warning/10' : 'border-gray-200 bg-white hover:border-slate-400'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-amber-700">
                    <Clock className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Contrato Plazo Fijo</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">Con fecha de vencimiento definida. Renovable al término.</p>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-3">Empleado</p>
              {selectedEmpleado ? (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-800 font-semibold">
                      {(selectedEmpleado.nombres || 'E')[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{`${selectedEmpleado.nombres || ''} ${selectedEmpleado.apellidos || ''}`.trim()}</p>
                      <p className="text-sm text-slate-500">CI {selectedEmpleado.ci_numero || '--'}</p>
                      <p className="text-sm text-slate-500">{selectedEmpleado.cargo || `Cargo ${selectedEmpleado.id_cargo || ''}`}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por empleado o CI..."
                      className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                    {empleadosQuery.isLoading ? (
                      <div className="p-4 text-sm text-slate-500">Cargando empleados...</div>
                    ) : empleadosFiltrados.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500">No se encontraron empleados.</div>
                    ) : (
                      empleadosFiltrados.slice(0, 6).map((empleado) => (
                        <button
                          key={empleado.id}
                          type="button"
                          onClick={() => setSelectedEmpleado(empleado)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <div className="font-medium text-slate-900">{`${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim()}</div>
                          <div className="text-sm text-slate-500">CI {empleado.ci_numero || '--'}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-2">Salario Base (Bs.)</label>
                <input
                  type="number"
                  min="0"
                  value={salarioBase}
                  onChange={(e) => setSalarioBase(e.target.value)}
                  placeholder="Ej: 5000.00"
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-2 text-xs text-slate-500">Mínimo SMN vigente: Bs. 2.362,00</p>
                {salarioBase && Number(salarioBase) < 2362 && (
                  <p className="mt-2 text-xs text-warning-700">El salario ingresado está por debajo del SMN vigente.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Fecha de Inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {tipo === 'plazo_fijo' && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Fecha de Fin</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {fechaInicio && fechaFin && new Date(fechaFin) <= new Date(fechaInicio) && (
                    <p className="mt-2 text-xs text-[#B45309]">La fecha de fin debe ser posterior a la fecha de inicio.</p>
                  )}
                  {diasDuracion !== null && diasDuracion < 30 && (
                    <p className="mt-2 text-xs text-[#B45309]">Contrato muy corto.</p>
                  )}
                  {fechaInicio && fechaFin && (
                    <p className="mt-2 text-xs text-sky-700">Duración: {buildDurationText(fechaInicio, fechaFin)}</p>
                  )}
                </div>
              )}
              <div className={tipo === 'plazo_fijo' ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-semibold mb-2">Observación</label>
                <textarea
                  rows="2"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Notas adicionales sobre el contrato..."
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            </div>

            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <Info className="w-4 h-4" />
              </span>
              <p>
                {tipo === 'indefinido'
                  ? 'Este contrato no vence. Los incrementos salariales anuales se gestionan desde Ajustes Salariales.'
                  : 'Recibirás una alerta 30 días antes del vencimiento para gestionar la renovación.'}
              </p>
            </div>
          </div>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 bg-gray-50 rounded-b-xl">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={crearIndefinidoMutation.isLoading || crearPlazoFijoMutation.isLoading}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {crearIndefinidoMutation.isLoading || crearPlazoFijoMutation.isLoading ? 'Creando...' : 'Crear Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevoContratoModal;
