import React from 'react';
import Header from '../components/layout/Header';

const AsistenciaDiaria = () => {
  return (
    <div>
      <Header title="Asistencia Diaria" subtitle="Registro de asistencia del personal" />
      <div className="p-4">
        <h1 className="text-3xl font-bold">Asistencia Diaria</h1>
        <p className="mt-2 text-gray-600">Aquí se mostrará la asistencia del día.</p>
      </div>
    </div>
  );
};

export default AsistenciaDiaria;
