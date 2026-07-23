import { useEffect, useState } from 'react';
import { CheckSquare, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { finalizarContrato } from '../../api/contratos';
import { toast } from 'react-hot-toast';

const FinalizarContratoModal = ({ contrato, isOpen, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [observacion, setObservacion] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setObservacion('');
    }
  }, [isOpen]);

  const finalizarMutation = useMutation({
    mutationFn: ({ contratoId, params }) => finalizarContrato(contratoId, params),
    onSuccess: (data) => {
      toast.success('Contrato finalizado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      if (onSuccess) onSuccess(data);
      onClose();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || 'Error al finalizar contrato');
    },
  });

  const handleSubmit = () => {
    finalizarMutation.mutate({ contratoId: contrato.id, params: { observacion: observacion || undefined } });
  };

  if (!isOpen || !contrato) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <CheckSquare className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Finalizar Contrato</h2>
              <p className="text-sm text-slate-500">Cierre formal del contrato por término natural.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{contrato.empleado_nombre || `Empleado ${contrato.id_empleado}`}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              <p>Tipo: {contrato.tipo_contrato === 'indefinido' ? 'Indefinido' : 'Plazo Fijo'}</p>
              <p>Inicio: {contrato.fecha_inicio}</p>
              {contrato.fecha_fin && <p>Fin: {contrato.fecha_fin}</p>}
              <p>Salario: {contrato.salario_base}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
            Finalizar indica que el contrato llegó a su término de forma normal. Diferente a rescindir, no implica conflicto entre las partes.
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Observación</label>
            <textarea
              rows="2"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Notas adicionales..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-slate-50">
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
            disabled={finalizarMutation.isLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-warning px-5 py-3 text-sm font-semibold text-white hover:bg-warning/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckSquare className="w-4 h-4" />
            Finalizar Contrato
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalizarContratoModal;
