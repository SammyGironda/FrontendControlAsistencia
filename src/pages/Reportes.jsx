import React from 'react';
import Header from '../components/layout/Header';

const Reportes = () => {
  return (
    <div>
      <Header title="Reportes" subtitle="Generación de informes" />
      <div className="p-4">
        <h1 className="text-3xl font-bold">Reportes Generales</h1>
        <p className="mt-2 text-gray-600">Aquí se listarán las opciones de reportes.</p>
      </div>
    </div>
  );
};

export default Reportes;
