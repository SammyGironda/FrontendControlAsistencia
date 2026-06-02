import React from 'react';

const EstadoBadge = ({ estado, size = 'md' }) => {
  const estadoMap = {
    activo: {
      label: 'Activo',
      bg: '#F0FFF4',
      text: '#376644',
      border: '#C6F6D5',
    },
    por_habilitar: {
      label: 'Por habilitar',
      bg: '#FFFBEB',
      text: '#D97706',
      border: '#FDE68A',
    },
    suspendido: {
      label: 'Suspendido',
      bg: '#FFF5F5',
      text: '#731B07',
      border: '#FECACA',
    },
    baja: {
      label: 'Baja',
      bg: '#F7FAFC',
      text: '#777F8F',
      border: '#E2E8F0',
    },
  };

  const estadoConfig = estadoMap[estado] || {
    label: estado ? estado.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Desconocido',
    bg: '#F3F4F6',
    text: '#374151',
    border: '#D1D5DB',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const dotSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-x-1.5 rounded-md ${sizeClasses[size]} font-medium ring-1 ring-inset`}
      style={{
        backgroundColor: estadoConfig.bg,
        color: estadoConfig.text,
        borderColor: estadoConfig.border,
      }}
    >
      <svg
        className={`${dotSizeClasses[size]} fill-current`}
        viewBox="0 0 6 6"
        aria-hidden="true"
      >
        <circle cx={3} cy={3} r={3} />
      </svg>
      {estadoConfig.label}
    </span>
  );
};

export default EstadoBadge;
