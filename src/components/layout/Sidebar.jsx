import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Upload, CalendarCheck,
  FileText, Settings, ClipboardList, LogOut
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Empleados', icon: Users, path: '/empleados' },
  { name: 'Ingesta de Marcaciones', icon: Upload, path: '/ingesta' },
  { name: 'Asistencia y Cálculos', icon: CalendarCheck, path: '/asistencia' },
  { name: 'Reportes', icon: FileText, path: '/reportes' },
  { name: 'Configuración', icon: Settings, path: '/configuracion' },
];

const Sidebar = () => {
  const { user } = useAuthStore();
  const location = useLocation();

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const isItemActive = (path) => {
    return location.pathname === path;
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
          {navItems.map((item) => {
            const isActive = isItemActive(item.path);
            return (
              <li key={item.name}>
                <a
                  href={item.path}
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
                  {isActive && (
                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-[#D9A404]" />
                  )}
                </a>
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
              {user ? getInitials(user.nombre) : 'U'}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user ? user.nombre : 'Usuario'}</p>
              <p className="text-white/60 text-xs">{user ? user.rol : 'Rol'}</p>
            </div>
          </div>
          <button className="flex-shrink-0 text-white/50 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
