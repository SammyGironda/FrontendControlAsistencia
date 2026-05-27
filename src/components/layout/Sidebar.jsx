import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Clock, CalendarCheck, Calculator,
  FileText, Settings, Building2, Upload
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Empleados', icon: Users, path: '/empleados' },
  { name: 'Horarios', icon: Clock, path: '/horarios' },
  { name: 'Asistencia', icon: CalendarCheck, path: '/asistencia' },
  { name: 'Cálculos', icon: Calculator, path: '/calculos' },
  { name: 'Reportes', icon: FileText, path: '/reportes' },
  { name: 'Configuración', icon: Settings, path: '/configuracion' },
];

const Sidebar = () => {
  const { user } = useAuthStore();

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <div className="w-60 bg-[#03178C] text-white flex flex-col h-screen fixed">
      <div className="flex items-center justify-center h-16 bg-[#03178C] border-b border-gray-700">
        <Building2 className="h-6 w-6 mr-2" />
        <span className="text-xl font-semibold">RRHH Bolivia</span>
      </div>
      <nav className="flex-1 py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center py-2 px-4 mb-2 mx-2 rounded-md transition-colors
                  ${isActive
                    ? 'bg-white/10 border-l-4 border-[#D9A404]'
                    : 'hover:bg-white/5 border-l-4 border-transparent'}`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700 mt-auto">
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
            {user ? getInitials(user.nombre) : 'U'}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{user ? user.nombre : 'Usuario'}</p>
            <p className="text-xs text-gray-300">{user ? user.rol : 'Rol'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
