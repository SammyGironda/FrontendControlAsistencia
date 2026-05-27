import React from 'react';
import Header from '../components/layout/Header';

const Configuracion = () => {
  return (
    <div>
      <Header title="Configuración" subtitle="Ajustes del sistema" />
      <div className="p-4">
        <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
        <p className="mt-2 text-gray-600">Aquí irán las opciones de configuración.</p>
      </div>
    </div>
  );
};

export default Configuracion;
