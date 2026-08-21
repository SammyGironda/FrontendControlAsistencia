import { useMemo, useState } from 'react';
import {
  AlertCircle, ClipboardList, Pencil, Plus, ShieldAlert, TrendingUp, TriangleAlert,
} from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import DecretoModal from './DecretoModal';
import AjustesDeDecretoModal from './AjustesDeDecretoModal';
import useAuthStore from '../../store/authStore';
import { esAdmin, esGestor } from '../../lib/permisos';
import { formatFecha, formatMoneda, aNumero } from '../../lib/formatters';
import { estadoDeDecreto } from '../../lib/tramosDecreto';
import { useDecretos } from '../../hooks/useAjustesSalariales';

const TOKENS = {
  primary: '#03178C',
  warning: '#8A5A00',
  warningLight: '#FFFAEB',
  danger: '#731B07',
  dangerLight: '#FFF5F5',
  textDark: '#1A202C',
  textMid: '#4A5568',
  textLight: '#718096',
  textMuted: '#CBD5E0',
  border: '#E2E8F0',
  borderLight: '#F7FAFC',
};

const COLUMNAS = ['AÑO', 'NUEVO SMN', 'REFERENCIA', 'VIGENCIA', 'TRAMOS', 'ACCIONES'];

/**
 * Incrementos salariales por decreto (rrhh.decreto_incremento_salarial +
 * rrhh.condicion_decreto), con trazabilidad hacia rrhh.ajuste_salarial.
 *
 * Igual que Departamentos/Impuestos: no se puede hacer early-return antes de
 * los hooks, de ahí los dos componentes.
 */
const Decretos = () => {
  const { user } = useAuthStore();

  if (!esGestor(user)) return <SinPermiso />;

  return <PanelDecretos puedeGestionar={esAdmin(user)} />;
};

const SinPermiso = () => (
  <div className="space-y-5 p-6">
    <div className="flex flex-col items-center gap-3 rounded-[12px] border border-[#E2E8F0] bg-white px-6 py-14 text-center shadow-sm">
      <ShieldAlert className="h-8 w-8 text-[#CBD5E0]" />
      <h1 className="text-[18px] font-semibold text-[#1A202C]">
        No tienes permiso para ver esta sección
      </h1>
      <p className="max-w-md text-[13px] text-[#718096]">
        Los decretos de incremento salarial están reservados a los roles
        <strong> admin</strong> y <strong>rrhh</strong>.
      </p>
    </div>
  </div>
);

const PanelDecretos = ({ puedeGestionar }) => {
  // null = cerrado, 'nuevo' = alta, o el objeto decreto que se edita.
  const [modalDecreto, setModalDecreto] = useState(null);
  // El decreto cuyos ajustes se están mostrando, o null.
  const [modalAjustes, setModalAjustes] = useState(null);

  const { data, isLoading, isError } = useDecretos();

  const decretos = useMemo(() => {
    const lista = Array.isArray(data) ? data : [];
    // Más reciente primero: es lo que se consulta con más frecuencia.
    return [...lista].sort((a, b) => b.anio - a.anio);
  }, [data]);

  return (
    <div className="p-6">
      <PageHeader
        title="Incrementos Salariales por Decreto"
        subtitle={
          isLoading
            ? 'Decretos supremos de incremento salarial y sus tramos'
            : `${decretos.length} ${decretos.length === 1 ? 'decreto registrado' : 'decretos registrados'}`
        }
        actions={
          puedeGestionar ? (
            <button
              type="button"
              onClick={() => setModalDecreto('nuevo')}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#03178C] px-4 text-[13px] font-semibold text-white transition hover:bg-[#021164]"
            >
              <Plus className="h-4 w-4" />
              Nuevo decreto
            </button>
          ) : null
        }
      />

      {/* No hay botón de "aplicar decreto masivo" en esta pantalla, a propósito:
          aplicar_decreto_anual no es idempotente (dos ejecuciones duplican
          ajustes por empleado) y un decreto con vigencia futura nunca
          sincroniza empleado.salario_base (el worker que debía hacerlo ya no
          existe). Ver CLAUDE.md antes de agregar esa acción. */}
      <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-100 p-4" style={{ backgroundColor: TOKENS.warningLight }}>
        <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: TOKENS.warning }} />
        <p className="text-[13px]" style={{ color: TOKENS.textMid }}>
          <strong style={{ color: TOKENS.warning }}>Aplicar un decreto a la planilla no está disponible acá.</strong>{' '}
          Aplicarlo dos veces duplicaría los ajustes de toda la planta, y un decreto con vigencia
          futura no actualiza el salario de los empleados automáticamente cuando llega la fecha.
          Esta pantalla permite registrar y consultar decretos; la aplicación masiva queda
          pendiente de otra sesión.
        </p>
      </div>

      {isError && (
        <div
          className="mb-5 flex items-center gap-3 rounded-lg p-4"
          style={{ backgroundColor: TOKENS.dangerLight, color: TOKENS.danger }}
        >
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">No se pudieron cargar los decretos</span>
        </div>
      )}

      <section className="max-w-6xl rounded-xl bg-white p-7 shadow-sm">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-slate-200" />
            ))}
          </div>
        )}

        {!isLoading && !isError && decretos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="mb-2 h-12 w-12" style={{ color: TOKENS.textMuted }} />
            <p className="text-sm" style={{ color: TOKENS.textMuted }}>
              No hay decretos registrados todavía.
            </p>
          </div>
        )}

        {!isLoading && !isError && decretos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${TOKENS.border}` }}>
                  {COLUMNAS.map((col) => (
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
                {decretos.map((decreto) => {
                  const esFuturo = estadoDeDecreto(decreto.fecha_vigencia) === 'futuro';
                  const cantidadTramos = decreto.condiciones?.length ?? 0;

                  return (
                    <tr key={decreto.id} style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}>
                      <td className="px-3 py-4 font-semibold" style={{ color: TOKENS.textDark }}>
                        {decreto.anio}
                      </td>
                      <td className="px-3 py-4" style={{ color: TOKENS.textMid }}>
                        {formatMoneda(aNumero(decreto.nuevo_smn))}
                      </td>
                      <td className="px-3 py-4 font-mono text-[13px]" style={{ color: TOKENS.textMid }}>
                        {decreto.referencia_decreto}
                      </td>
                      <td className="px-3 py-4" style={{ color: TOKENS.textMid }}>
                        {formatFecha(decreto.fecha_vigencia)}
                        {esFuturo && (
                          <span
                            className="ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ backgroundColor: TOKENS.warningLight, color: TOKENS.warning }}
                          >
                            Programado
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4" style={{ color: TOKENS.textMid }}>
                        {cantidadTramos} {cantidadTramos === 1 ? 'tramo' : 'tramos'}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setModalAjustes(decreto)}
                            title="Ver ajustes generados"
                            aria-label={`Ver ajustes generados bajo ${decreto.referencia_decreto}`}
                            className="transition hover:opacity-70"
                            style={{ color: TOKENS.primary }}
                          >
                            <TrendingUp className="h-4 w-4" />
                          </button>

                          {puedeGestionar && (
                            <button
                              type="button"
                              onClick={() => setModalDecreto(decreto)}
                              title="Editar decreto"
                              aria-label={`Editar ${decreto.referencia_decreto}`}
                              className="transition hover:opacity-70"
                              style={{ color: TOKENS.primary }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Se montan sólo cuando están abiertos, con key distinta por decreto:
          así el estado interno se reinicia sin useEffect + setState. */}
      {modalDecreto && (
        <DecretoModal
          key={modalDecreto === 'nuevo' ? 'nuevo' : modalDecreto.id}
          decreto={modalDecreto === 'nuevo' ? null : modalDecreto}
          onCerrar={() => setModalDecreto(null)}
          onGuardado={() => setModalDecreto(null)}
        />
      )}

      {modalAjustes && (
        <AjustesDeDecretoModal
          key={modalAjustes.id}
          decreto={modalAjustes}
          onCerrar={() => setModalAjustes(null)}
        />
      )}
    </div>
  );
};

export default Decretos;
