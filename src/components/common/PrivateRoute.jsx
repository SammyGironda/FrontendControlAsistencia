import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

// Ruta de la pantalla de cambio obligatorio. Es la única que un usuario con
// contraseña temporal puede ver, así que se compara contra ella para no
// redirigir en bucle infinito.
const RUTA_CAMBIO_PASSWORD = '/cambiar-password';

const PrivateRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Un usuario con contraseña temporal no puede usar el resto del sistema hasta
  // reemplazarla. El guard vive acá y no en cada pantalla para que valga también
  // en las rutas que se agreguen después.
  //
  // Esto es de USABILIDAD, no de seguridad: el backend no bloquea a estos
  // usuarios: sus tokens son válidos y sus endpoints responden normal. Lo que se
  // evita es que alguien se quede indefinidamente con la contraseña que le dictó
  // el admin, que un tercero también conoce.
  //
  // El valor sale del `user` del store, que se rellena con la respuesta de
  // /auth/login y /auth/me — nunca de los claims del JWT, que son una foto del
  // momento de la emisión y no bajarían al cambiar la contraseña.
  if (user?.requiere_cambio_password && location.pathname !== RUTA_CAMBIO_PASSWORD) {
    return <Navigate to={RUTA_CAMBIO_PASSWORD} replace />;
  }

  // La contracara: ya no hay nada que cambiar, así que la pantalla no debe
  // seguir accesible. Sin esto queda un formulario que sólo puede devolver 400.
  if (!user?.requiere_cambio_password && location.pathname === RUTA_CAMBIO_PASSWORD) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
