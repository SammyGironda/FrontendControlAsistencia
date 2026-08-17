import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, Upload, CalendarCheck,
  FileText, Settings, ClipboardList, LogOut, AlertCircle, FileSignature,
  SlidersHorizontal, Shield, CalendarX, ChevronDown, Palmtree, Clock, UserCog
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { esGestor } from '../../lib/permisos';
import { getIncidenciasPendientes } from '../../api/marcaciones';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Empleados', icon: Users, path: '/empleados' },
  { name: 'Contratos', icon: FileSignature, path: '/contratos' },
  {
    name: 'Ingesta de Marcaciones',
    icon: Upload,
    path: '/ingesta',
    subItems: [
      { name: 'Resolución de Incidencias', icon: AlertCircle, path: '/marcaciones/incidencias', badge: 'incidencias' }
    ]
  },
  { name: 'Asistencia y Cálculos', icon: CalendarCheck, path: '/asistencia' },
  {
    name: 'Vacaciones',
    icon: Palmtree,
    path: '/vacaciones',
    subItems: [
      // Las compensaciones alimentan el saldo vacacional, por eso cuelgan de
      // aca. La ruta comparte prefijo con /vacaciones para que isItemActive
      // (que usa startsWith) mantenga resaltado al padre.
      { name: 'Compensaciones', icon: Clock, path: '/vacaciones/compensaciones', soloGestores: true }
    ]
  },
  { name: 'Reportes', icon: FileText, path: '/reportes' },
  {
    name: 'Configuración',
    icon: Settings,
    path: '/configuracion',
    subItems: [
      { name: 'Reglas y Turnos', icon: SlidersHorizontal, path: '/configuracion' },
      // Desde el 2026-08-13 GET /api/v1/roles/ exige admin o rrhh: sin este flag
      // la pantalla se ofrece a todos y responde 403 al cargar.
      { name: 'Roles del Sistema', icon: Shield, path: '/configuracion/roles', soloGestores: true },
      // GET /api/v1/usuarios/ es admin+rrhh (rrhh consulta el padron), asi que
      // el flag correcto es soloGestores y no uno de solo-admin. Dentro de la
      // pantalla, crear cuentas y resetear contrasenas se oculta a rrhh aparte:
      // esos endpoints si son admin.
      { name: 'Usuarios del Sistema', icon: UserCog, path: '/configuracion/usuarios', soloGestores: true },
      { name: 'Feriados', icon: CalendarX, path: '/configuracion/feriados' }
    ]
  },
];

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [incidenciasCount, setIncidenciasCount] = useState(0);
  const [configExpanded, setConfigExpanded] = useState(() => location.pathname.startsWith('/configuracion'));

  // Sub-items reservados a admin/rrhh. Ocultarlos es COSMETICO: el guard real
  // esta en el backend (require_admin / require_roles). Sirve para no ofrecer
  // una pantalla que respondera 403.
  //
  // Cuando no queda ningun sub-item visible hay que borrar la clave, no dejar
  // un array vacio: el render hace `{item.subItems && (<ul>...)}`, asi que un
  // array vacio pinta un <ul> con padding, y ademas apaga el punto dorado del
  // item activo, que depende de `!item.subItems`.
  const puedeVerCompensaciones = esGestor(user);

  const itemsVisibles = useMemo(
    () =>
      navItems.map((item) => {
        if (!item.subItems) return item;

        const subItems = item.subItems.filter(
          (sub) => !sub.soloGestores || puedeVerCompensaciones
        );

        return subItems.length > 0
          ? { ...item, subItems }
          : { ...item, subItems: undefined };
      }),
    [puedeVerCompensaciones]
  );

  useEffect(() => {
    if (location.pathname.startsWith('/configuracion')) {
      setConfigExpanded(true);
    }

    const fetchIncidencias = async () => {
      try {
        // TODO: Cuando la API soporte filtros, pasar { estado: 'pendiente' }
        const response = await getIncidenciasPendientes();
        const items = Array.isArray(response)
          ? response
          : Array.isArray(response.items)
          ? response.items
          : Array.isArray(response.value)
          ? response.value
          : [];
        setIncidenciasCount(items.length);
      } catch (error) {
        console.error("Error fetching incidencias:", error);
      }
    };

    fetchIncidencias();
    const interval = setInterval(fetchIncidencias, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [location.pathname]);


  // No hace falta navegar a mano: al apagar isAuthenticated, PrivateRoute
  // redirige solo a /login (todas las rutas menos /login cuelgan de el).
  //
  // Se limpia la cache de React Query porque esto es navegacion SPA, sin
  // recarga de pagina — a diferencia del interceptor de 401 de api/client.js,
  // que hace window.location.href. Sin este clear(), el staleTime de 5 min
  // dejaria los datos del usuario anterior visibles para el siguiente que
  // inicie sesion en la misma pestana.
  const handleLogout = () => {
    queryClient.clear();
    logout();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const isItemActive = (path) => {
    if (path === '/') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-60 h-screen bg-[#03178C] text-white flex flex-col fixed top-0 left-0 z-50 justify-between">
      {/* Zona Superior - Logo */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-[10px] bg-[#D9A404] flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base">RRHH Bolivia</p>
            <p className="text-white/60 text-xs">Gestión de Personal</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1">
        <p className="text-white/40 font-semibold text-xs uppercase tracking-widest px-5 pt-4 pb-2">
          Módulos
        </p>
        <ul className="space-y-1 px-3">
          {itemsVisibles.map((item) => {
            const isActive = isItemActive(item.path);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isConfigItem = item.path === '/configuracion' && hasSubItems;
            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  onClick={isConfigItem ? () => setConfigExpanded((prev) => !prev) : undefined}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors relative ${
                    isActive
                      ? 'bg-white/10'
                      : 'hover:bg-white/8'
                  }`}
                >
                  <item.icon
                    className={`w-[18px] h-[18px] flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-white/50'
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-white/70'
                    }`}
                  >
                    {item.name}
                  </span>
                  {isConfigItem && (
                    <ChevronDown
                      className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                        configExpanded ? 'rotate-180 text-white' : 'text-white/50'
                      }`}
                    />
                  )}
                  {isActive && !item.subItems && (
                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-[#D9A404]" />
                  )}
                </Link>
                {item.subItems && (
                  <ul className={`pl-3 pt-1 overflow-hidden transition-all duration-200 ${
                    (isConfigItem ? configExpanded : true)
                      ? 'max-h-48 opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}>
                    {item.subItems.map(subItem => {
                      const isSubActive = location.pathname.startsWith(subItem.path);
                      return (
                        <li key={subItem.name}>
                          <Link
                            to={subItem.path}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors relative ${
                              isSubActive
                                ? 'bg-white/10'
                                : 'hover:bg-white/8'
                            }`}
                            style={{ paddingLeft: '28px' }}
                          >
                            <subItem.icon
                              className={`w-4 h-4 flex-shrink-0 ${
                                isSubActive ? 'text-white' : 'text-white/50'
                              }`}
                            />
                            <span
                              className={`text-[13px] ${
                                isSubActive
                                  ? 'text-white font-semibold'
                                  : 'text-white/70'
                              }`}
                            >
                              {subItem.name}
                            </span>
                            {subItem.badge === 'incidencias' && incidenciasCount > 0 && (
                              <span className="ml-auto w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                                {incidenciasCount}
                              </span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Zona Inferior - Usuario */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white font-semibold text-xs">
              {user ? getInitials(user.username) : 'U'}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user ? user.username : 'Usuario'}</p>
              <p className="text-white/60 text-xs">{user ? user.nombre_rol : 'Rol'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex-shrink-0 text-white/50 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
