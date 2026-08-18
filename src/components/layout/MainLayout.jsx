import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#F2F2F2]">
      <Sidebar />
      {/* min-w-0 anula el `min-width: auto` que traen los flex items por defecto.
          Sin el, este contenedor se niega a encogerse por debajo del ancho de su
          contenido mas ancho y los overflow-x-auto de las paginas nunca scrollean. */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-auto overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
