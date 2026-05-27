import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Home } from 'lucide-react';
import { formatFecha } from '../../lib/formatters';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

const Header = ({ title, subtitle }) => {
  const navigate = useNavigate();
  const currentDate = dayjs();

  return (
    <header className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
      <div>
        <nav className="flex" aria-label="Breadcrumb">
          <ol role="list" className="flex items-center space-x-2">
            <li>
              <Link to="/" className="text-gray-400 hover:text-gray-500">
                <Home className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span className="sr-only">Home</span>
              </Link>
            </li>
            {title && (
              <li>
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-gray-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                  </svg>
                  <span className="ml-2 text-sm font-medium text-gray-500">{title}</span>
                </div>
              </li>
            )}
          </ol>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-gray-600 text-sm">
          {formatFecha(currentDate)}
        </span>
        <button
          onClick={() => navigate('/marcaciones')}
          className="inline-flex items-center rounded-md bg-[#D9A404] px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9A404]"
        >
          <Upload className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
          Importar Excel
        </button>
      </div>
    </header>
  );
};

export default Header;
