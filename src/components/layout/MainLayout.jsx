import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#F2F2F2]">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60">
        <div className="max-w-[1440px] w-full mx-auto">
          <Header />
          <main className="p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
