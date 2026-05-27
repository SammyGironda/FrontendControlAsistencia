import React from 'react';
import Header from '../components/layout/Header';

const EmpleadosListado = () => {
  return (
    <div>
      <Header title="Empleados" subtitle="Gestión de personal" />
      <div className="p-4">
        <h1 className="text-3xl font-bold">Lista de Empleados</h1>
        <p className="mt-2 text-gray-600">Aquí se mostrará la tabla de empleados.</p>
      </div>
    </div>
  );
};

export default EmpleadosListado;
