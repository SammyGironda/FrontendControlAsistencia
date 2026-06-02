import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/common/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import EmpleadosListado from './pages/empleados/EmpleadosListado';
import EmpleadoForm from './pages/empleados/EmpleadoForm';
import IngestaExcel from './pages/marcaciones/IngestaExcel';
import ResolucionIncidencias from './pages/marcaciones/ResolucionIncidencias';
import AsistenciaPage from './pages/asistencia/AsistenciaPage';
import Reportes from './pages/reportes/Reportes';
import Configuracion from './pages/configuracion/Configuracion';
import Roles from './pages/configuracion/Roles';
import Feriados from './pages/configuracion/Feriados';
import Contratos from './pages/contratos/Contratos';

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
          <Route path="/empleados/editar/:id" element={<EmpleadoForm />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/ingesta" element={<IngestaExcel />} />
          <Route path="/marcaciones/incidencias" element={<ResolucionIncidencias />} />
          <Route path="/asistencia" element={<AsistenciaPage />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/configuracion/roles" element={<Roles />} />
          <Route path="/configuracion/feriados" element={<Feriados />} />
          {/* Add more private routes here */}
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
