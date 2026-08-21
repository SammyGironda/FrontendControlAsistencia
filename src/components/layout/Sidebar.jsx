import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, Upload, CalendarCheck,
  FileText, Settings, ClipboardList, LogOut, AlertCircle, FileSignature,
  SlidersHorizontal, Shield, CalendarX, ChevronDown, Palmtree, Clock, UserCog, Network,
  Percent, TrendingUp
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { esAdmin, esGestor } from '../../lib/permisos';
import { useIncidenciasPendientes } from '../../hooks/useMarcaciones';

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
      // La estructura organizacional (rrhh.departamento, jerarquica). El backend
      // deja leerla a cualquier autenticado, pero escribirla es require_admin;
      // la pantalla se abre a admin+rrhh porque el organigrama en solo lectura
      // le sirve a RRHH, y oculta los botones para quien no es admin.
      { name: 'Departamentos', icon: Network, path: '/configuracion/departamentos', soloGestores: true },
      // Desde el 2026-08-13 GET /api/v1/roles/ exige admin o rrhh: sin este flag
      // la pantalla se ofrece a todos y responde 403 al cargar.
      { name: 'Roles del Sistema', icon: Shield, path: '/configuracion/roles', soloGestores: true },
      // Solo admin. El backend deja que rrhh haga el GET del padron, pero todas
      // las acciones de la pantalla (crear, resetear, eliminar) son
      // require_admin: a rrhh le quedaria una tabla de solo lectura sin ningun
      // boton. La pantalla tambien se cierra por su cuenta, este flag solo evita
      // ofrecerla en el menu.
      { name: 'Usuarios del Sistema', icon: UserCog, path: '/configuracion/usuarios', soloAdmin: true },
      { name: 'Feriados', icon: CalendarX, path: '/configuracion/feriados' },
      { name: 'Impuestos y Descuentos', icon: Percent, path: '/configuracion/impuestos', soloGestores: true },
      // Igual reparto que Impuestos: lectura admin+rrhh, crear/editar solo
      // admin (require_admin en el backend). El item se muestra a ambos y
      // DecretoModal/Decretos.jsx ocultan los botones de escritura para rrhh.
      { name: 'Incrementos Salariales', icon: TrendingUp, path: '/configuracion/decretos', soloGestores: true }
    ]
  },
];

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [configExpanded, setConfigExpanded] = useState(() => location.pathname.startsWith('/configuracion'));

  // El conteo NO depende de la ruta: el Sidebar se monta una sola vez (es un
  // layout route en App.jsx) y la query se refresca sola cada minuto. Antes
  // vivia en el useEffect de abajo, que al depender de location.pathname
  // rearmaba el intervalo y repedia el conteo en cada navegacion.
  const { data: incidencias = [] } = useIncidenciasPendientes();
  const incidenciasCount = incidencias.length;

  // Sub-items reservados por rol. Ocultarlos es COSMETICO: el guard real esta en
  // el backend (require_admin / require_roles). Sirve para no ofrecer una
  // pantalla que respondera 403.
  //
  // Son dos alcances distintos y no intercambiables: `soloGestores` es admin+rrhh
  // (espeja ROLES_GESTORES) y `soloAdmin` es admin a secas. esGestor NO implica
  // esAdmin, asi que un item mal etiquetado se le ofrece a rrhh para que reciba
  // un 403 al entrar.
  //
  // Cuando no queda ningun sub-item visible hay que borrar la clave, no dejar
  // un array vacio: el render hace `{item.subItems && (<ul>...)}`, asi que un
  // array vacio pinta un <ul> con padding, y ademas apaga el punto dorado del
  // item activo, que depende de `!item.subItems`.
  const puedeVerDeGestores = esGestor(user);
  const puedeVerDeAdmin = esAdmin(user);

  const itemsVisibles = useMemo(
    () =>
      navItems.map((item) => {
        if (!item.subItems) return item;

        const subItems = item.subItems.filter(
          (sub) =>
            (!sub.soloGestores || puedeVerDeGestores) &&
            (!sub.soloAdmin || puedeVerDeAdmin)
        );

        return subItems.length > 0
          ? { ...item, subItems }
          : { ...item, subItems: undefined };
      }),
    [puedeVerDeGestores, puedeVerDeAdmin]
  );

  // Depende de la ruta a proposito, y es lo unico que deberia: al entrar a
  // cualquier pantalla de /configuracion el submenu queda desplegado.
  useEffect(() => {
    if (location.pathname.startsWith('/configuracion')) {
      setConfigExpanded(true);
    }
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
    // sticky y no fixed: asi el sidebar ocupa su propio espacio dentro del flex
    // row de MainLayout y el contenido calcula su ancho solo, sin el ml-60 que
    // antes reservaba el hueco a mano. self-start evita que se estire a la altura
    // total de la pagina, que es lo que le deja margen a sticky para funcionar.
    <div className="w-60 flex-shrink-0 self-start h-screen bg-[#03178C] text-white flex flex-col sticky top-0 z-50 justify-between">
      {/* Zona Superior - Logo */}
      <div className="flex-shrink-0 p-5">
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
      {/* min-h-0 desarma el `min-height: auto` que trae todo flex item: sin el,
          flex-1 nunca deja que este nav mida menos que su contenido, el sobrante
          se derrama fuera del h-screen del padre y los ultimos items quedan
          inalcanzables (el padre es sticky, scrollear la pagina no lo mueve).
          Con la altura ya acotada, overflow-y-auto le da su propio scroll. */}
      <nav className="flex-1 min-h-0 overflow-y-auto sidebar-scroll">
        <p className="text-white/40 font-semibold text-xs uppercase tracking-widest px-5 pt-4 pb-2">
          Módulos
        </p>
        <ul className="space-y-1 px-3">
          {itemsVisibles.map((item) => {
            const isActive = isItemActive(item.path);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isConfigItem = item.path === '/configuracion' && hasSubItems;

            const clasesItem = `flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors relative ${
              isActive ? 'bg-white/10' : 'hover:bg-white/8'
            }`;

            const contenidoItem = (
              <>
                <item.icon
                  className={`w-[18px] h-[18px] flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-white/50'
                  }`}
                />
                <span
                  className={`text-sm ${
                    isActive ? 'text-white font-semibold' : 'text-white/70'
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
              </>
            );

            return (
              <li key={item.name}>
                {/* Configuracion despliega el submenu, no navega: por eso es un
                    <button> y no un <Link>. Interceptar el clic de un <Link> con
                    preventDefault dejaria un <a href> que miente — se abriria en
                    pestana nueva con Ctrl+clic y se anuncia como enlace.
                    w-full porque un boton se encoge a su contenido aun con
                    display:flex, a diferencia del <a> que rendea <Link>. */}
                {isConfigItem ? (
                  <button
                    type="button"
                    onClick={() => setConfigExpanded((prev) => !prev)}
                    aria-expanded={configExpanded}
                    className={`w-full text-left ${clasesItem}`}
                  >
                    {contenidoItem}
                  </button>
                ) : (
                  <Link to={item.path} className={clasesItem}>
                    {contenidoItem}
                  </Link>
                )}
                {item.subItems && (
                  /* El max-h acota la animacion de despliegue, asi que tiene que
                     dar de sobra para el submenu mas largo (Configuracion, hoy
                     7 items) o los ultimos quedan recortados por el
                     overflow-hidden. Subir este valor al agregar sub-items. */
                  <ul className={`pl-3 pt-1 overflow-hidden transition-all duration-200 ${
                    (isConfigItem ? configExpanded : true)
                      ? 'max-h-[28rem] opacity-100'
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
      <div className="flex-shrink-0 p-4 border-t border-white/10">
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
