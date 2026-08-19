import { useMemo, useState } from 'react';
import {
  AlertCircle, CalendarClock, ChevronDown, ChevronRight, Landmark,
  Percent, Plus, ShieldAlert, Users,
} from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import NuevaTasaModal from './NuevaTasaModal';
import useAuthStore from '../../store/authStore';
import { esAdmin, esGestor } from '../../lib/permisos';
import { formatFecha, formatearPorcentaje } from '../../lib/formatters';
import { agruparPorConcepto, LABORAL, PATRONAL } from '../../lib/tasasImpuesto';
import { useParametrosImpuesto } from '../../hooks/useImpuestos';

const TOKENS = {
  primary: '#03178C',
  danger: '#731B07',
  dangerLight: '#FFF5F5',
  warning: '#8A5A00',
  warningLight: '#FFFAEB',
  textDark: '#1A202C',
  textMid: '#4A5568',
  textLight: '#718096',
  textMuted: '#CBD5E0',
  border: '#E2E8F0',
  borderLight: '#F7FAFC',
};

// Las dos secciones de tasas vigentes. La separacion LABORAL / PATRONAL es el
// punto de la pantalla: quien mira tiene que poder distinguir de un vistazo lo
// que se le descuenta al empleado de lo que paga la empresa.
const SECCIONES = [
  {
    tipo: LABORAL,
    icono: Users,
    titulo: 'Descuentos al empleado',
    bajada: 'Se descuentan de su salario: el empleado recibe el neto.',
  },
  {
    tipo: PATRONAL,
    icono: Landmark,
    titulo: 'Aportes de la empresa',
    bajada: 'Los paga la empresa por encima del salario. NO se le descuentan al empleado.',
  },
];

const ImpuestosDescuentos = () => {
  const { user } = useAuthStore();
  // No se puede hacer early-return antes de los hooks: de ahi los dos
  // componentes, mismo patron que Departamentos.jsx.
  if (!esGestor(user)) return <SinPermiso />;
  return <PanelImpuestos puedeGestionar={esAdmin(user)} />;
};

const SinPermiso = () => (
  <div className="space-y-5 p-6">
    <div className="flex flex-col items-center gap-3 rounded-[12px] border border-[#E2E8F0] bg-white px-6 py-14 text-center shadow-sm">
      <ShieldAlert className="h-8 w-8 text-[#CBD5E0]" />
      <h1 className="text-[18px] font-semibold text-[#1A202C]">
        No tienes permiso para ver esta sección
      </h1>
      <p className="max-w-md text-[13px] text-[#718096]">
        Las tasas de impuestos y descuentos legales están reservadas a los roles
        <strong> admin</strong> y <strong>rrhh</strong>.
      </p>
    </div>
  </div>
);

const PanelImpuestos = ({ puedeGestionar }) => {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);

  const { data, isLoading, isError } = useParametrosImpuesto();

  const lista = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const { vigentes, programadas, historial, conceptos } = useMemo(
    () => agruparPorConcepto(lista),
    [lista]
  );

  const totalVigentes = vigentes[LABORAL].length + vigentes[PATRONAL].length;

  return (
    <div className="p-6">
      <PageHeader
        title="Impuestos y Descuentos Legales"
        subtitle={
          isLoading
            ? 'Tasas vigentes de RC-IVA y aportes a pensiones'
            : `${totalVigentes} ${totalVigentes === 1 ? 'tasa vigente' : 'tasas vigentes'}` +
              `${historial.length > 0 ? ` · ${historial.length} en el historial` : ''}`
        }
        actions={
          puedeGestionar ? (
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#03178C] px-4 text-[13px] font-semibold text-white transition hover:bg-[#021164]"
            >
              <Plus className="h-4 w-4" />
              Registrar nueva tasa
            </button>
          ) : null
        }
      />

      {isError && (
        <div
          className="mb-5 flex items-center gap-3 rounded-lg p-4"
          style={{ backgroundColor: TOKENS.dangerLight, color: TOKENS.danger }}
        >
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">
            No se pudieron cargar las tasas de impuestos
          </span>
        </div>
      )}

      <div className="max-w-5xl space-y-5">
        {SECCIONES.map(({ tipo, icono: Icono, titulo, bajada }) => (
          <SeccionVigentes
            key={tipo}
            Icono={Icono}
            titulo={titulo}
            bajada={bajada}
            tasas={vigentes[tipo]}
            programadas={programadas}
            isLoading={isLoading}
          />
        ))}

        <SeccionHistorial
          abierto={historialAbierto}
          onToggle={() => setHistorialAbierto((v) => !v)}
          tasas={historial}
          isLoading={isLoading}
        />
      </div>

      {/* Se monta solo cuando esta abierto: asi el estado interno se reinicia al
          cerrar sin un useEffect que llame a setState. */}
      {modalAbierto && (
        <NuevaTasaModal
          conceptos={conceptos}
          tasas={lista}
          onCerrar={() => setModalAbierto(false)}
          onGuardado={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
};

const SeccionVigentes = ({ Icono, titulo, bajada, tasas, programadas, isLoading }) => (
  <section className="rounded-xl bg-white p-7 shadow-sm">
    <div className="mb-5 flex items-start gap-3 border-l-4 pl-3" style={{ borderColor: TOKENS.primary }}>
      <Icono className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: TOKENS.primary }} />
      <div>
        <h3 className="text-lg font-bold" style={{ color: TOKENS.textDark }}>{titulo}</h3>
        <p className="text-[13px]" style={{ color: TOKENS.textLight }}>{bajada}</p>
      </div>
    </div>

    {isLoading && (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-slate-200" />)}
      </div>
    )}

    {!isLoading && tasas.length === 0 && (
      <div className="flex flex-col items-center justify-center py-8">
        <Percent className="mb-2 h-10 w-10" style={{ color: TOKENS.textMuted }} />
        <p className="text-sm" style={{ color: TOKENS.textMuted }}>
          No hay tasas vigentes en esta categoría.
        </p>
      </div>
    )}

    {!isLoading && tasas.length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${TOKENS.border}` }}>
              {['CONCEPTO', 'PORCENTAJE', 'VIGENTE DESDE', 'DETALLE'].map((col) => (
                <th
                  key={col}
                  className="px-3 py-3 text-[11px] font-semibold uppercase"
                  style={{ color: TOKENS.textLight, letterSpacing: '0.05em' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasas.map((tasa) => {
              const programada = programadas.get(tasa.nombre);
              return (
                <tr key={tasa.id} style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}>
                  <td className="px-3 py-4 font-mono text-[13px] font-semibold" style={{ color: TOKENS.textDark }}>
                    {tasa.nombre}
                  </td>
                  <td className="px-3 py-4 text-[15px] font-bold" style={{ color: TOKENS.primary }}>
                    {formatearPorcentaje(tasa.porcentaje)}
                  </td>
                  <td className="px-3 py-4" style={{ color: TOKENS.textMid }}>
                    {formatFecha(tasa.fecha_vigencia_inicio)}
                  </td>
                  <td className="px-3 py-4">
                    <p className="max-w-md text-[12px]" style={{ color: TOKENS.textLight }}>
                      {tasa.descripcion || '—'}
                    </p>
                    {/* Una tasa futura es informacion SOBRE este concepto, no
                        otra categoria: por eso va acá y no en una seccion aparte. */}
                    {programada && (
                      <p
                        className="mt-2 flex items-start gap-1.5 rounded px-2 py-1.5 text-[12px] font-medium"
                        style={{ backgroundColor: TOKENS.warningLight, color: TOKENS.warning }}
                      >
                        <CalendarClock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          Programada: pasa a {formatearPorcentaje(programada.porcentaje)} el{' '}
                          {formatFecha(programada.fecha_vigencia_inicio)}.
                        </span>
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const SeccionHistorial = ({ abierto, onToggle, tasas, isLoading }) => (
  <section className="rounded-xl bg-white p-7 shadow-sm">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 text-left"
      aria-expanded={abierto}
    >
      {abierto
        ? <ChevronDown className="h-4 w-4" style={{ color: TOKENS.textLight }} />
        : <ChevronRight className="h-4 w-4" style={{ color: TOKENS.textLight }} />}
      <div className="border-l-4 pl-3" style={{ borderColor: TOKENS.textMuted }}>
        <h3 className="text-lg font-bold" style={{ color: TOKENS.textDark }}>
          Historial de tasas anteriores
        </h3>
        <p className="text-[13px]" style={{ color: TOKENS.textLight }}>
          {isLoading
            ? 'Tasas que ya no rigen'
            : `${tasas.length} ${tasas.length === 1 ? 'tasa reemplazada' : 'tasas reemplazadas'}`}
        </p>
      </div>
    </button>

    {abierto && !isLoading && tasas.length === 0 && (
      <p className="mt-5 text-sm" style={{ color: TOKENS.textMuted }}>
        Todavía no se reemplazó ninguna tasa.
      </p>
    )}

    {abierto && tasas.length > 0 && (
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${TOKENS.border}` }}>
              {['CONCEPTO', 'TIPO', 'PORCENTAJE', 'RIGIÓ DESDE', 'HASTA'].map((col) => (
                <th
                  key={col}
                  className="px-3 py-3 text-[11px] font-semibold uppercase"
                  style={{ color: TOKENS.textLight, letterSpacing: '0.05em' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasas.map((tasa) => (
              <tr key={tasa.id} style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}>
                <td className="px-3 py-3 font-mono text-[13px]" style={{ color: TOKENS.textMid }}>
                  {tasa.nombre}
                </td>
                <td className="px-3 py-3 text-[12px]" style={{ color: TOKENS.textLight }}>
                  {tasa.tipo_aporte}
                </td>
                <td className="px-3 py-3 font-semibold" style={{ color: TOKENS.textMid }}>
                  {formatearPorcentaje(tasa.porcentaje)}
                </td>
                <td className="px-3 py-3" style={{ color: TOKENS.textLight }}>
                  {formatFecha(tasa.fecha_vigencia_inicio)}
                </td>
                <td className="px-3 py-3" style={{ color: TOKENS.textLight }}>
                  {tasa.fecha_vigencia_fin ? formatFecha(tasa.fecha_vigencia_fin) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

export default ImpuestosDescuentos;
