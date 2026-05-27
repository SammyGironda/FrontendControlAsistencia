import React from 'react';
import { estadoColor } from '../../lib/formatters';

const EstadoBadge = ({ estado, size = 'md' }) => {
  const colors = estadoColor(estado);

  const textMap = {
    presente: 'Presente',
    ausente: 'Ausente',
    feriado: 'Feriado',
    retraso: 'Retraso',
    permiso_parcial: 'Permiso Parcial',
    licencia_medica: 'Licencia Médica',
    presente_exento: 'Presente Exento',
    descanso: 'Descanso',
  };

  const displayEstado = textMap[estado] || estado.charAt(0).toUpperCase() + estado.slice(1).replace(/_/g, ' ');

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const dotSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  }

  return (
    <span
      className={`inline-flex items-center gap-x-1.5 rounded-md ${colors.bg} ${colors.text} ${sizeClasses[size]} font-medium ring-1 ring-inset ${colors.border}`}
    >
      <svg
        className={`${dotSizeClasses[size]} fill-current`}
        viewBox="0 0 6 6"
        aria-hidden="true"
      >
        <circle cx={3} cy={3} r={3} />
      </svg>
      {displayEstado}
    </span>
  );
};

export default EstadoBadge;
