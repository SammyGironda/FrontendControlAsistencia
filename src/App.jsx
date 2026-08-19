import { useCallback, useEffect, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoaderCircle, AlertTriangle } from 'lucide-react';
import PrivateRoute from './components/common/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import CambiarPasswordObligatorio from './pages/auth/CambiarPasswordObligatorio';
import Dashboard from './pages/dashboard/Dashboard';
import EmpleadosListado from './pages/empleados/EmpleadosListado';
import EmpleadoForm from './pages/empleados/EmpleadoForm';
import IngestaExcel from './pages/marcaciones/IngestaExcel';
import ResolucionIncidencias from './pages/marcaciones/ResolucionIncidencias';
import AsistenciaPage from './pages/asistencia/AsistenciaPage';
import ReportesPage from './pages/reportes/ReportesPage';
import Configuracion from './pages/configuracion/Configuracion';
import Departamentos from './pages/configuracion/Departamentos';
import Roles from './pages/configuracion/Roles';
import Usuarios from './pages/configuracion/Usuarios';
import Feriados from './pages/configuracion/Feriados';
import ImpuestosDescuentos from './pages/configuracion/ImpuestosDescuentos';
import Contratos from './pages/contratos/Contratos';
import VacacionesPage from './pages/vacaciones/VacacionesPage';
import CompensacionesPage from './pages/compensaciones/CompensacionesPage';
import { login, getCurrentUser } from './api/auth';
import useAuthStore from './store/authStore';

const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';

// Normaliza cualquier forma de error de axios a un string legible. FastAPI
// devuelve `detail` como string (401 "Credenciales inválidas") o como array
// de objetos de validación (422 por campos faltantes) — ambos casos deben
// quedar en texto plano para el mensaje de authError.
const extractErrorMessage = (err) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
  }
  return err.message || 'Error desconocido';
};

function App() {
  const { setAuth, logout } = useAuthStore();
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const hasBootstrapped = useRef(false);

  const runBootstrap = useCallback(async () => {
    setAuthError(null);

    if (BYPASS_AUTH) {
      const devUsername = import.meta.env.VITE_BYPASS_USERNAME;
      const devPassword = import.meta.env.VITE_BYPASS_PASSWORD;

      if (!devUsername || !devPassword) {
        setAuthError(
          'VITE_BYPASS_AUTH está activo pero falta VITE_BYPASS_USERNAME y/o ' +
          'VITE_BYPASS_PASSWORD en Frontend/.env. Completa ambas variables ' +
          'con credenciales reales del backend y recarga la página.'
        );
        return; // authReady se queda en false a propósito.
      }

      try {
        const { token, usuario } = await login(devUsername, devPassword);
        setAuth(token, usuario);
        setAuthReady(true);
      } catch (err) {
        setAuthError(
          `No se pudo iniciar la sesión de desarrollo (bypass) con el ` +
          `usuario "${devUsername}": ${extractErrorMessage(err)}. Verifica ` +
          `VITE_BYPASS_USERNAME/VITE_BYPASS_PASSWORD en Frontend/.env y que ` +
          `el backend esté corriendo y accesible en VITE_API_URL.`
        );
        // authReady se queda en false: al reintentar se vuelve a mostrar el
        // spinner, no un parpadeo hacia /login.
      }
      return;
    }

    const persistedToken = useAuthStore.getState().token;
    if (persistedToken) {
      try {
        const usuario = await getCurrentUser();
        setAuth(persistedToken, usuario);
      } catch (err) {
        if (err.response?.status === 401) {
          // client.js ya mostró el toast de sesión expirada y ya llamó a
          // logout() + redirect vía su interceptor de 401. Este logout() es
          // defensivo, por si esa lógica cambiara y dejara de correr sola.
          logout();
        }
        // Cualquier otro error (backend caído, timeout, 5xx) NO desloguea:
        // el token puede seguir siendo válido, solo falló la red/el
        // backend. Las pantallas siguientes mostrarán sus propios errores.
      }
    }
    setAuthReady(true);
  }, [setAuth, logout]);

  useEffect(() => {
    // Guard de instancia única: App.jsx es el componente raíz, montado una
    // sola vez por carga de página real. En dev, StrictMode vuelve a
    // invocar este efecto una vez más (mount → cleanup → mount) para
    // detectar bugs de limpieza; este ref evita que eso dispare una
    // segunda llamada real a /auth/login o /auth/me.
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    runBootstrap();
  }, [runBootstrap]);

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F2] p-8">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-600" />
          <h1 className="mt-4 text-lg font-semibold text-gray-800">
            No se pudo iniciar la aplicación
          </h1>
          <p className="mt-2 text-sm text-gray-600">{authError}</p>
          <button
            type="button"
            onClick={runBootstrap}
            className="mt-6 w-full rounded-lg bg-[#D9A404] px-4 py-2 font-semibold text-[#03178C] shadow-sm transition-colors duration-200 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D9A404]"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F2]">
        <LoaderCircle className="h-10 w-10 animate-spin text-[#03178C]" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<PrivateRoute />}>
        {/* Fuera de MainLayout a propósito: sin barra lateral no hay forma de
            navegar a otra pantalla, que es justo lo que se busca mientras la
            contraseña siga siendo temporal. PrivateRoute redirige acá y, una vez
            cambiada, deja de permitir el acceso a esta ruta. */}
        <Route path="/cambiar-password" element={<CambiarPasswordObligatorio />} />

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
          <Route path="/vacaciones" element={<VacacionesPage />} />
          <Route path="/vacaciones/compensaciones" element={<CompensacionesPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/configuracion/departamentos" element={<Departamentos />} />
          <Route path="/configuracion/roles" element={<Roles />} />
          <Route path="/configuracion/usuarios" element={<Usuarios />} />
          <Route path="/configuracion/feriados" element={<Feriados />} />
          <Route path="/configuracion/impuestos" element={<ImpuestosDescuentos />} />
          {/* Add more private routes here */}
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
