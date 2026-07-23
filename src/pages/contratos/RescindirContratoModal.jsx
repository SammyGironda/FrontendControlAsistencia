import { useEffect, useState } from 'react';
import { XCircle, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rescindirContrato } from '../../api/contratos';
import { toast } from 'react-hot-toast';

const RescindirContratoModal = ({ contrato, isOpen, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setMotivo('');
      setConfirmado(false);
    }
  }, [isOpen]);

  const rescindirMutation = useMutation({
    mutationFn: ({ contratoId, params }) => rescindirContrato(contratoId, params),
    onSuccess: (data) => {
      toast.success('Contrato rescindido. Recuerda gestionar la baja del empleado si corresponde.');
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      if (onSuccess) onSuccess(data);
      onClose();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || 'Error al rescindir contrato');
    },
  });

  const handleSubmit = () => {
    if (motivo.trim().length < 15) {
      toast.error('El motivo debe tener al menos 15 caracteres.');
      return;
    }
    if (!confirmado) {
      toast.error('Debes confirmar que deseas rescindir el contrato.');
      return;
    }
    rescindirMutation.mutate({ contratoId: contrato.id, params: { observacion: motivo } });
  };

  if (!isOpen || !contrato) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-danger">
              <XCircle className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Rescindir Contrato</h2>
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

          <div className="rounded-2xl bg-red-50 border border-rose-200 p-4 text-sm text-rose-700">
            <p className="font-semibold">Al rescindir este contrato:</p>
            <ul className="mt-3 space-y-2 list-disc pl-5">
              <li>El contrato quedará marcado como 'Rescindido'</li>
              <li>Se registrará la fecha de rescisión de hoy</li>
              <li>El empleado deberá ser dado de baja por separado</li>
              <li>Esta acción no se puede deshacer</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Motivo de rescisión</label>
            <textarea
              rows="3"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Incumplimiento de contrato / Acuerdo mutuo / Causa justificada..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-slate-900 shadow-sm focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20"
            />
            <p className="mt-2 text-xs text-slate-500">Mínimo 15 caracteres</p>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-danger focus:ring-danger"
            />
            Confirmo que deseo rescindir el contrato de {contrato.empleado_nombre || `empleado ${contrato.id_empleado}`}
          </label>
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
            disabled={rescindirMutation.isLoading || motivo.trim().length < 15 || !confirmado}
            className="rounded-2xl bg-danger px-5 py-3 text-sm font-semibold text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Rescindir Contrato
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescindirContratoModal;
