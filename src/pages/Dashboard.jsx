import React from 'react';
import Header from '../components/layout/Header';

const Dashboard = () => {
  return (
    <div>
      <Header title="Dashboard" subtitle="Resumen general del sistema" />
      <div className="p-4">
        <h1 className="text-3xl font-bold">Welcome to the Dashboard</h1>
        <p className="mt-2 text-gray-600">Your analytics and quick insights will appear here.</p>
      </div>
    </div>
  );
};

export default Dashboard;
