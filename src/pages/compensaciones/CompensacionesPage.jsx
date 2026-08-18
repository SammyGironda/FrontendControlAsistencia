import { useMemo, useState } from 'react';
import { Plus, Clock, AlertCircle, ShieldAlert, Info, CalendarClock, Users } from 'lucide-react';

import SelectField from '../../components/common/SelectField';
import useAuthStore from '../../store/authStore';
import { esAdmin, esGestor } from '../../lib/permisos';
import { useCompensaciones } from '../../hooks/useCompensaciones';
import { useEmpleadosTodos } from '../../hooks/useVacaciones';
import { nombreEmpleado } from '../../lib/calendarioVacaciones';
import { aNumero, formatearHoras, formatFecha, formatFechaHora } from '../../lib/formatters';
import NuevaCompensacionModal from './NuevaCompensacionModal';
import PageHeader from '../../components/layout/PageHeader';

// Historial de compensaciones de horas extra + alta manual.
//
// Los dos endpoints tienen guards DISTINTOS y la pantalla los refleja:
//   GET  -> admin + rrhh  (auditar lo cargado)
//   POST -> solo admin    (acreditar horas es irreversible desde la API)
// Por eso hay dos permisos separados y no uno solo.
//
// Ocultar es COSMETICO: la autorizacion real esta en el backend. Sirve para no
// ofrecer una accion que terminaria en 403. React Router no tiene guard de rol
// en este repo (PrivateRoute solo mira isAuthenticated), asi que un supervisor
// puede llegar tecleando la URL: sin la tarjeta de "sin permiso" veria el error
// crudo del 403.

const ANIO_ACTUAL = new Date().getFullYear();
const GESTIONES = [ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2, ANIO_ACTUAL - 3, ANIO_ACTUAL - 4];

const SkeletonBlock = ({ className = '' }) => (
  <div className={`rounded-[6px] bg-[#E2E8F0] animate-pulse ${className}`} />
);

const SummaryCard = ({ icon: Icon, label, value, accentColor }) => (
  <div className="flex min-w-[190px] flex-1 items-center gap-4 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-3">
    <span
      className="inline-flex h-10 w-10 items-center justify-center rounded-full"
      style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
    >
      <Icon className="h-5 w-5" />
    </span>
    <div>
      <p className="text-[24px] font-semibold leading-none text-[#1A202C]">{value}</p>
      <p className="mt-1 text-[12px] text-[#718096]">{label}</p>
    </div>
  </div>
);

const CompensacionesPage = () => {
  const user = useAuthStore((state) => state.user);
  const puedeVer = esGestor(user); // admin + rrhh -> GET
  const puedeRegistrar = esAdmin(user); // solo admin -> POST

  // El contenido va en un componente aparte para que sus queries NO se monten
  // cuando el usuario no puede verlas: los hooks corren antes de cualquier
  // return, asi que un early return dentro de este mismo componente igual
  // dispararia los GET que el backend contesta 403.
  if (!puedeVer) return <SinPermiso />;

  return <PanelCompensaciones puedeRegistrar={puedeRegistrar} />;
};

const SinPermiso = () => (
  <div className="space-y-5 p-6">
    <div className="flex flex-col items-center gap-3 rounded-[12px] border border-[#E2E8F0] bg-white px-6 py-14 text-center shadow-sm">
      <ShieldAlert className="h-8 w-8 text-[#CBD5E0]" />
      <h1 className="text-[18px] font-semibold text-[#1A202C]">
        No tienes permiso para ver esta sección
      </h1>
      <p className="max-w-md text-[13px] text-[#718096]">
        El historial de compensaciones de horas extra está reservado a los roles
        <strong> admin</strong> y <strong>RRHH</strong>.
      </p>
    </div>
  </div>
);

const PanelCompensaciones = ({ puedeRegistrar }) => {
  const [filtroEmpleado, setFiltroEmpleado] = useState('all');
  const [filtroGestion, setFiltroGestion] = useState('all');
  const [modalAbierto, setModalAbierto] = useState(false);

  // 'all' -> undefined: el cliente de la API omite el filtro si no es truthy.
  const idEmpleadoFiltro = filtroEmpleado === 'all' ? undefined : Number(filtroEmpleado);
  const gestionFiltro = filtroGestion === 'all' ? undefined : Number(filtroGestion);

  const compensacionesQuery = useCompensaciones(idEmpleadoFiltro, gestionFiltro);
  const empleadosQuery = useEmpleadosTodos();

  const compensaciones = useMemo(
    () => compensacionesQuery.data || [],
    [compensacionesQuery.data]
  );

  const empleados = useMemo(() => {
    const lista = empleadosQuery.data || [];
    return [...lista].sort((a, b) => nombreEmpleado(a).localeCompare(nombreEmpleado(b)));
  }, [empleadosQuery.data]);

  // id -> empleado. La respuesta del backend solo trae ids: ni id_empleado ni
  // id_registrado_por vienen con nombre. Ambos son FK a empleado.id
  // (id_registrado_por NO apunta a usuario.id), asi que el mismo mapa sirve para
  // las dos columnas.
  const mapaEmpleados = useMemo(
    () => new Map(empleados.map((empleado) => [empleado.id, empleado])),
    [empleados]
  );

  const totalHoras = useMemo(
    () => compensaciones.reduce((acc, item) => acc + aNumero(item.horas), 0),
    [compensaciones]
  );

  const empleadosDistintos = useMemo(
    () => new Set(compensaciones.map((item) => item.id_empleado)).size,
    [compensaciones]
  );

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Compensaciones de horas extra"
        subtitle="Horas acreditadas al saldo vacacional por trabajo en fin de semana o feriado no planeado"
        actions={
          puedeRegistrar ? (
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#03178C] px-4 text-[13px] font-semibold text-white transition hover:bg-[#021164]"
            >
              <Plus className="h-4 w-4" />
              Registrar compensación
            </button>
          ) : null
        }
      />

      {!puedeRegistrar && (
        <div className="flex items-start gap-2 rounded-[10px] border border-[#C7D2FE] bg-[#EBF4FF] p-3 text-[13px] text-[#03178C]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            El registro de compensaciones está reservado al rol admin. Aquí puedes consultar y
            auditar todo lo que se cargó.
          </div>
        </div>
      )}

      <div className="rounded-[8px] border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Empleado"
            value={filtroEmpleado}
            onChange={(e) => setFiltroEmpleado(e.target.value)}
          >
            <option value="all">Todos</option>
            {empleados.map((empleado) => (
              <option key={empleado.id} value={empleado.id}>
                {nombreEmpleado(empleado)}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Gestión"
            value={filtroGestion}
            onChange={(e) => setFiltroGestion(e.target.value)}
          >
            <option value="all">Todas</option>
            {GESTIONES.map((anio) => (
              <option key={anio} value={anio}>
                {anio}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      {compensacionesQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
          <SkeletonBlock className="h-[420px]" />
        </div>
      ) : compensacionesQuery.isError ? (
        <div className="rounded-[10px] border border-[#FEB2B2] bg-[#FFF5F5] p-4 text-[#731B07]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            No se pudo cargar el historial de compensaciones. Verifica que el backend esté
            corriendo en localhost:8000
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              icon={CalendarClock}
              label="Compensaciones registradas"
              value={compensaciones.length}
              accentColor="#03178C"
            />
            <SummaryCard
              icon={Clock}
              label="Horas acreditadas"
              value={formatearHoras(totalHoras)}
              accentColor="#376644"
            />
            <SummaryCard
              icon={Users}
              label={empleadosDistintos === 1 ? 'Empleado alcanzado' : 'Empleados alcanzados'}
              value={empleadosDistintos}
              accentColor="#975A16"
            />
          </div>

          <div className="overflow-x-auto rounded-[12px] border border-[#E2E8F0] bg-white shadow-sm">
            {compensaciones.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <Clock className="h-8 w-8 text-[#CBD5E0]" />
                <p className="text-[14px] text-[#718096]">
                  Sin compensaciones registradas para el filtro seleccionado
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                      Empleado
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                      Fecha compensada
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                      Horas
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                      Gestión
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                      Motivo
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                      Registrado por
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#718096]">
                      Registrado el
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* El backend ya devuelve ordenado por fecha DESC */}
                  {compensaciones.map((item) => {
                    const empleado = mapaEmpleados.get(item.id_empleado);
                    const registrador = mapaEmpleados.get(item.id_registrado_por);

                    return (
                      <tr key={item.id} className="border-b border-[#F7FAFC] last:border-0">
                        <td className="px-4 py-3">
                          <div className="text-[13px] font-semibold text-[#1A202C]">
                            {nombreEmpleado(empleado)}
                          </div>
                          {empleado?.ci_numero && (
                            <div className="mt-0.5 text-[12px] text-[#718096]">
                              CI {empleado.ci_numero}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#4A5568]">
                          {formatFecha(item.fecha)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-[#C6F6D5] px-2.5 py-1 text-[11px] font-semibold text-[#376644]">
                            +{formatearHoras(item.horas)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#4A5568]">{item.gestion}</td>
                        <td className="px-4 py-3">
                          <div
                            className="max-w-[280px] truncate text-[13px] text-[#4A5568]"
                            title={item.motivo}
                          >
                            {item.motivo}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#4A5568]">
                          {/* id_registrado_por es nullable (ON DELETE SET NULL) */}
                          {item.id_registrado_por ? nombreEmpleado(registrador) : '—'}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#4A5568]">
                          {formatFechaHora(item.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Se monta solo cuando esta abierto: al cerrarlo React lo desmonta y el
          formulario se reinicia solo, sin useEffect de limpieza. */}
      {modalAbierto && <NuevaCompensacionModal onClose={() => setModalAbierto(false)} />}
    </div>
  );
};

export default CompensacionesPage;
