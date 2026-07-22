import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { renovarContrato } from '../../api/contratos';
import { formatFecha, formatMoneda } from '../../lib/formatters';
import { toast } from 'react-hot-toast';

const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const addYear = (value) => {
  const date = new Date(value);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

const RenovarContratoModal = ({ contrato, isOpen, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [salarioBase, setSalarioBase] = useState('');
  const [observacion, setObservacion] = useState('');

  useEffect(() => {
    if (isOpen && contrato) {
      setFechaInicio(contrato.fecha_fin ? addDays(contrato.fecha_fin, 1) : '');
      setFechaFin(contrato.fecha_fin ? addYear(addDays(contrato.fecha_fin, 1)) : '');
      setSalarioBase(String(contrato.salario_base || ''));
      setObservacion('');
    }
  }, [isOpen, contrato]);

  const variation = useMemo(() => {
    if (!contrato || !salarioBase) return null;
    const current = Number(contrato.salario_base);
    const next = Number(salarioBase);
    if (!current) return null;
    return ((next - current) / current) * 100;
  }, [contrato, salarioBase]);

  const renovarMutation = useMutation({
    mutationFn: (payload) => renovarContrato(contrato.id, payload),
    onSuccess: (data) => {
      toast.success(`Contrato renovado correctamente hasta ${formatFecha(data.fecha_fin)}`);
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      if (onSuccess) onSuccess(data);
      onClose();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || 'Error al renovar contrato');
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!fechaFin || !fechaInicio) {
      toast.error('Debes seleccionar fecha de inicio y fin');
      return;
    }
    if (new Date(fechaFin) <= new Date(fechaInicio)) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }
    if (!salarioBase || Number(salarioBase) <= 0) {
      toast.error('Ingresa un salario base válido');
      return;
    }

    renovarMutation.mutate({
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      salario_base: Number(salarioBase),
      observacion: observacion || undefined,
    });
  };

  if (!isOpen || !contrato) return null;

  const diasRestantes = contrato.fecha_fin ? Math.ceil((new Date(contrato.fecha_fin) - new Date()) / 86400000) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto px-4 py-6">
      <div className="w-full max-w-xl mx-auto flex flex-col rounded-2xl bg-white shadow-xl max-h-none">
        <div className="flex items-center justify-between flex-shrink-0 border-b border-gray-200 px-6 pt-5 pb-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <RefreshCw className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Renovar Contrato</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{`${contrato.empleado_nombre || 'Empleado'} (${contrato.id_empleado})`}</p>
                  <p className="text-sm text-slate-500">{contrato.tipo_contrato === 'plazo_fijo' ? 'Plazo Fijo' : 'Indefinido'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-sm text-slate-500">Fin actual</p>
                  <p className="text-sm font-semibold text-slate-900">{formatFecha(contrato.fecha_fin)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Salario actual</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatMoneda(Number(contrato.salario_base))}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                  Vence en {diasRestantes !== null ? `${diasRestantes} día${diasRestantes === 1 ? '' : 's'}` : '—'}
                </span>
              </div>
            </div>

            <form className="grid gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nueva fecha de fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {contrato.fecha_fin && (
                  <p className="mt-2 text-xs text-slate-500">Sugerencia: {formatFecha(addYear(addDays(contrato.fecha_fin, 1)))}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Nuevo salario base (Bs.)</label>
                <input
                  type="number"
                  min="0"
                  value={salarioBase}
                  onChange={(e) => setSalarioBase(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {variation !== null && (
                  <p className={`mt-2 text-xs ${variation >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Variación: {variation >= 0 ? '+' : ''}{variation.toFixed(1)}% respecto al contrato anterior
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Observación</label>
                <textarea
                  rows="2"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Notas adicionales..."
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </form>

            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 text-sm text-slate-700">
              Al renovar, el contrato actual se marcará como 'finalizado' y se creará uno nuevo con los datos ingresados. El historial se conserva.
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={renovarMutation.isLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-success px-5 py-3 text-sm font-semibold text-white hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Confirmar Renovación
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenovarContratoModal;
