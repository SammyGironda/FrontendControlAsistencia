import React from 'react';
import Header from '../components/layout/Header';
import { useParams } from 'react-router-dom';

const EmpleadoForm = () => {
  const { id } = useParams();
  const isEditMode = !!id;

  return (
    <div>
      <Header
        title={isEditMode ? "Editar Empleado" : "Nuevo Empleado"}
        subtitle={isEditMode ? `Editando empleado con ID: ${id}` : "Crear un nuevo registro de empleado"}
      />
      <div className="p-4">
        <h1 className="text-3xl font-bold">{isEditMode ? "Formulario de Edición de Empleado" : "Formulario de Nuevo Empleado"}</h1>
        <p className="mt-2 text-gray-600">Aquí irá el formulario para crear/editar empleados.</p>
      </div>
    </div>
  );
};

export default EmpleadoForm;
