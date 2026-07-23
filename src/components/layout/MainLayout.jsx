import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#F2F2F2]">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60 overflow-hidden">
        <main className="flex-1 overflow-x-auto overflow-y-auto p-4">
          <div className="min-w-max">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
