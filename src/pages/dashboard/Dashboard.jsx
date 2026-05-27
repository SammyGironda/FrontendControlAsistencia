import { useQuery } from '@tanstack/react-query';
import { Users, Clock, AlertTriangle, TrendingUp, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { getEmpleados } from '../../api/empleados';
import { getAsistencia } from '../../api/asistencia';
import { getIncidencias } from '../../api/marcaciones';
import { getReportes } from '../../api/reportes'; // Asumiendo que existe

dayjs.locale('es');

// --- Helper Functions ---
const getInitials = (name = '') => {
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const avatarColors = [
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-yellow-200 text-yellow-800',
  'bg-purple-200 text-purple-800',
  'bg-pink-200 text-pink-800',
];

const getAvatarColor = (id) => avatarColors[id % avatarColors.length];


// --- Components ---

const MetricCard = ({ title, value, subtext, icon, children, borderColor, to }) => {
  const CardContent = () => (
    <div className={`bg-white p-5 rounded-xl shadow-sm flex flex-col justify-between h-full border-l-4 ${borderColor}`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium text-gray-500">{title}</span>
      </div>
      <div className="mt-2">
        {value !== null && value !== undefined ? (
          <div className="text-3xl font-bold text-gray-800">{value}</div>
        ) : (
          <div className="h-9 bg-gray-200 rounded w-24 animate-pulse"></div>
        )}
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
      </div>
      {children && <div className="mt-auto pt-2">{children}</div>}
    </div>
  );

  if (to) {
    return <Link to={to} className="block hover:shadow-md transition-shadow rounded-xl"><CardContent /></Link>;
  }
  return <CardContent />;
};

const SkeletonCard = () => (
  <div className="bg-white p-5 rounded-xl shadow-sm animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-9 bg-gray-300 rounded w-1/2 mb-3"></div>
    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-xl">
    <FileText className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">Sin Datos</h3>
    <p className="mt-1 text-sm text-gray-500">{message}</p>
  </div>
);

const Avatar = ({ name, id }) => (
  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(id)}`}>
    {getInitials(name)}
  </div>
);


// --- Dashboard Page ---

const Dashboard = () => {
  // --- API Calls ---
  const { data: empleadosData, isLoading: isLoadingEmpleados, isError: isErrorEmpleados } = useQuery({
    queryKey: ['empleados', { 'estado': 'Activo' }],
    queryFn: () => getEmpleados({ estado: 'Activo', limit: 500 })
  });

  const { data: asistenciaData, isLoading: isLoadingAsistencia, isError: isErrorAsistencia } = useQuery({
    queryKey: ['asistenciaHoy'],
    queryFn: () => getAsistencia({ fecha: dayjs().format('YYYY-MM-DD') })
  });

  const { data: incidenciasData, isLoading: isLoadingIncidencias, isError: isErrorIncidencias } = useQuery({
    queryKey: ['incidencias'],
    queryFn: () => getIncidencias()
  });

  // Mock data for top absences, replace with real API call
  const { data: topAusentismoData, isLoading: isLoadingAusentismo } = useQuery({
      queryKey: ['topAusentismo'],
      queryFn: async () => {
          // This should be a real API call, e.g., getReportes({ tipo: 'ausentismo', limit: 5 })
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
          return [
              { id: 1, empleado: { id: 10, nombre: 'Carlos Rodriguez', ci_numero: '8234567', complemento_dep: 'LP', area: { nombre: 'Logística' } }, faltas: 5, retrasos: 3 },
              { id: 2, empleado: { id: 12, nombre: 'Elena Flores', ci_numero: '7123456', complemento_dep: 'CB', area: { nombre: 'Ventas' } }, faltas: 4, retrasos: 7 },
              { id: 3, empleado: { id: 5, nombre: 'Pedro Castillo', ci_numero: '6987654', complemento_dep: 'SC', area: { nombre: 'Producción' } }, faltas: 3, retrasos: 2 },
          ];
      }
  });

  // --- Metric Calculations ---
  const totalEmpleados = isErrorEmpleados ? '—' : empleadosData?.total || 0;
  
  const { presentes, totalHoy, porcentajeAsistencia, colorBarra } = (() => {
    if (isErrorAsistencia || !asistenciaData?.items || !empleadosData?.total) return { presentes: 0, totalHoy: 0, porcentajeAsistencia: 0, colorBarra: 'bg-gray-300' };
    const presentes = asistenciaData.items.filter(a => a.estado === 'Presente').length;
    const totalHoy = empleadosData.total;
    const porcentaje = totalHoy > 0 ? (presentes / totalHoy) * 100 : 0;
    let color = 'bg-green-500';
    if (porcentaje < 60) color = 'bg-red-500';
    else if (porcentaje < 80) color = 'bg-orange-500';
    return { presentes, totalHoy, porcentajeAsistencia: porcentaje, colorBarra: color };
  })();

  const retrasosHoy = isErrorAsistencia ? '—' : (asistenciaData?.items.filter(a => a.retraso_minutos > 0).length || 0);
  const alertasPendientes = isErrorIncidencias ? '—' : (incidenciasData?.total || 0);

  const isLoading = isLoadingEmpleados || isLoadingAsistencia || isLoadingIncidencias;

  return (
    <div className="p-6 bg-surface min-h-full font-sans">
      {/* --- Header --- */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center text-sm text-gray-500">
            <span>RRHH Bolivia</span>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="font-semibold text-primary">Dashboard</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{dayjs().format('dddd, D [de] MMMM [de] YYYY')}</p>
        </div>
        <Link to="/marcaciones">
          <button className="bg-accent text-primary font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-accent-hover transition-colors flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Excel
          </button>
        </Link>
      </div>

      {/* --- Metrics Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Empleados Activos"
              value={totalEmpleados}
              subtext="empleados registrados"
              icon={<Users className="w-6 h-6 text-gray-400" />}
              borderColor="border-primary"
            />
            <MetricCard
              title="Asistencia Hoy"
              value={`${porcentajeAsistencia.toFixed(0)}%`}
              subtext={`${presentes} presentes de ${totalHoy} activos`}
              icon={<TrendingUp className="w-6 h-6 text-gray-400" />}
              borderColor={colorBarra.replace('bg-', 'border-')}
            >
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div className={`${colorBarra} h-2.5 rounded-full`} style={{ width: `${porcentajeAsistencia}%` }}></div>
              </div>
            </MetricCard>
            <MetricCard
              title="Retrasos Hoy"
              value={<div className="bg-orange-100 text-warning font-bold w-min px-3 py-1 rounded-full">{retrasosHoy}</div>}
              subtext="empleados con retraso"
              icon={<Clock className="w-6 h-6 text-gray-400" />}
              borderColor="border-warning"
            />
            <MetricCard
              title="Alertas Pendientes"
              value={<div className={`font-bold w-min px-3 py-1 rounded-full ${alertasPendientes > 0 ? 'bg-red-100 text-danger' : 'bg-green-100 text-success'}`}>{alertasPendientes}</div>}
              subtext="marcaciones sin resolver"
              icon={<AlertTriangle className="w-6 h-6 text-gray-400" />}
              borderColor={alertasPendientes > 0 ? 'border-danger' : 'border-success'}
              to="/marcaciones"
            />
          </>
        )}
      </div>

      {/* --- Absences Table --- */}
      <div className="mt-8 bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 5 — Mayor Ausentismo</h2>
        {isLoadingAusentismo ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-2 animate-pulse">
                <div className="h-9 w-9 bg-gray-300 rounded-full"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : topAusentismoData && topAusentismoData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleado</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">CI</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Área</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Faltas</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Retrasos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topAusentismoData.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">0{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar name={item.empleado.nombre} id={item.empleado.id} />
                        <span className="font-medium text-gray-900 text-sm">{item.empleado.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.empleado.ci_numero} {item.empleado.complemento_dep}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {item.empleado.area.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="font-bold text-sm text-danger bg-red-100 px-2 py-1 rounded-md">{item.faltas}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{item.retrasos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="Sin registros de faltas este mes" />
        )}
      </div>
    </div>
  );
};

export default Dashboard;

