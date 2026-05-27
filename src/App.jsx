import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/common/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmpleadosListado from './pages/EmpleadosListado';
import EmpleadoForm from './pages/EmpleadoForm';
import IngestaExcel from './pages/IngestaExcel';
import AsistenciaDiaria from './pages/AsistenciaDiaria';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/empleados" element={<EmpleadosListado />} />
          <Route path="/empleados/nuevo" element={<EmpleadoForm />} />
          <Route path="/empleados/:id" element={<EmpleadoForm />} />
          <Route path="/marcaciones" element={<IngestaExcel />} />
          <Route path="/asistencia" element={<AsistenciaDiaria />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/configuracion" element={<Configuracion />} />
          {/* Add more private routes here */}
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
