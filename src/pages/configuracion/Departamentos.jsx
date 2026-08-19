import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Loader2,
  Network,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../../components/layout/PageHeader';
import DepartamentoModal from './DepartamentoModal';
import useAuthStore from '../../store/authStore';
import { esAdmin, esGestor } from '../../lib/permisos';
import {
  aplanarArbol,
  construirArbol,
  contarHijosActivos,
} from '../../lib/arbolDepartamentos';
import {
  mensajeDeError,
  useDepartamentos,
  useDesactivarDepartamento,
  useReactivarDepartamento,
} from '../../hooks/useDepartamentos';

const TOKENS = {
  primary: '#03178C',
  success: '#376644',
  successLight: '#F0FFF4',
  danger: '#731B07',
  dangerLight: '#FFF5F5',
  textDark: '#1A202C',
  textMid: '#4A5568',
  textLight: '#718096',
  textMuted: '#CBD5E0',
  border: '#E2E8F0',
  borderLight: '#F7FAFC',
};

const COLUMNAS = ['DEPARTAMENTO', 'CÓDIGO', 'SUBDEPARTAMENTOS', 'ESTADO', 'ACCIONES'];

// Cuánto se corre cada nivel de la jerarquía, en píxeles.
const SANGRIA_POR_NIVEL = 24;

const Badge = ({ texto, fondo, color }) => (
  <span
    className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
    style={{ backgroundColor: fondo, color }}
  >
    {texto}
  </span>
);

/**
 * Estructura organizacional de la empresa (rrhh.departamento, jerárquica vía
 * id_padre). NO es complemento_dep (el catálogo SEGIP de los 9 departamentos de
 * Bolivia), ni rol, ni cargo.
 *
 * Visible para admin y rrhh: el organigrama es una referencia legítima para
 * gestión de personal. Las acciones de escritura son admin-only, espejando el
 * `require_admin` del backend — a rrhh le queda la vista de sólo lectura, que
 * acá sí tiene valor por sí sola (a diferencia del padrón de cuentas, donde no
 * lo tenía y por eso esa pantalla se cerró entera).
 *
 * Como siempre, esto es COSMÉTICO: la autorización real la aplica el backend.
 */
const Departamentos = () => {
  const { user } = useAuthStore();

  if (!esGestor(user)) return <SinPermiso />;

  return <PanelDepartamentos puedeGestionar={esAdmin(user)} />;
};

const SinPermiso = () => (
  <div className="space-y-5 p-6">
    <div className="flex flex-col items-center gap-3 rounded-[12px] border border-[#E2E8F0] bg-white px-6 py-14 text-center shadow-sm">
      <ShieldAlert className="h-8 w-8 text-[#CBD5E0]" />
      <h1 className="text-[18px] font-semibold text-[#1A202C]">
        No tienes permiso para ver esta sección
      </h1>
      <p className="max-w-md text-[13px] text-[#718096]">
        La estructura organizacional está reservada a los roles
        <strong> admin</strong> y <strong>rrhh</strong>.
      </p>
    </div>
  </div>
);

const PanelDepartamentos = ({ puedeGestionar }) => {
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  // null = cerrado, 'nuevo' = alta, o el objeto departamento que se edita.
  const [modal, setModal] = useState(null);
  const [confirmandoBaja, setConfirmandoBaja] = useState(null);

  const { data: departamentos, isLoading, isError } = useDepartamentos();

  const desactivarMutation = useDesactivarDepartamento();
  const reactivarMutation = useReactivarDepartamento();

  const lista = useMemo(
    () => (Array.isArray(departamentos) ? departamentos : []),
    [departamentos]
  );

  // El conteo de hijos activos sale de la lista COMPLETA, no de la filtrada: es
  // lo que decide si se puede desactivar, y esconder los inactivos no debe
  // cambiar esa respuesta.
  const hijosActivos = useMemo(() => contarHijosActivos(lista), [lista]);

  // El filtro corre ANTES de construir el árbol. Así, al ocultar un padre
  // desactivado, sus hijos activos no desaparecen con él: quedan huérfanos y
  // construirArbol los promueve a raíz.
  const filas = useMemo(() => {
    const visibles = mostrarInactivos ? lista : lista.filter((d) => d.activo);
    return aplanarArbol(construirArbol(visibles));
  }, [lista, mostrarInactivos]);

  const totalActivos = lista.filter((d) => d.activo).length;

  const desactivar = async (depto) => {
    try {
      await desactivarMutation.mutateAsync(depto.id);
      setConfirmandoBaja(null);
      toast.success(`"${depto.nombre}" quedó desactivado.`);
    } catch (error) {
      setConfirmandoBaja(null);
      // RN-22: el backend rechaza con 400 y su detail trae el conteo exacto de
      // cargos o empleados que lo impiden. 6 segundos porque ese número es lo
      // accionable del mensaje y hay que alcanzar a leerlo.
      toast.error(mensajeDeError(error, 'No se pudo desactivar el departamento.'), {
        duration: 6000,
      });
    }
  };

  const reactivar = async (depto) => {
    try {
      await reactivarMutation.mutateAsync(depto.id);
      toast.success(`"${depto.nombre}" volvió a estar activo.`);
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo reactivar el departamento.'), {
        duration: 6000,
      });
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Departamentos"
        subtitle={
          isLoading
            ? 'Estructura organizacional de la empresa'
            : `Estructura organizacional · ${totalActivos} ${
                totalActivos === 1 ? 'departamento activo' : 'departamentos activos'
              }${
                lista.length > totalActivos ? ` · ${lista.length - totalActivos} desactivado(s)` : ''
              }`
        }
      />

      <section className="max-w-6xl rounded-xl bg-white p-7 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="border-l-4 pl-3" style={{ borderColor: TOKENS.primary }}>
            <h3 className="text-lg font-bold" style={{ color: TOKENS.textDark }}>
              Organigrama
            </h3>
            <p className="text-[13px]" style={{ color: TOKENS.textLight }}>
              Cada departamento se muestra debajo del que lo contiene.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-[13px]" style={{ color: TOKENS.textMid }}>
              <input
                type="checkbox"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
                className="h-4 w-4 rounded border-[#E2E8F0]"
              />
              Mostrar desactivados
            </label>

            {puedeGestionar && (
              <button
                type="button"
                onClick={() => setModal('nuevo')}
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: TOKENS.primary }}
              >
                <Plus className="h-4 w-4" />
                Nuevo departamento
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-slate-200" />
            ))}
          </div>
        )}

        {isError && (
          <div
            className="flex items-center gap-3 rounded-lg p-4"
            style={{ backgroundColor: TOKENS.dangerLight, color: TOKENS.danger }}
          >
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">
              No se pudieron cargar los departamentos
            </span>
          </div>
        )}

        {!isLoading && !isError && filas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <Network className="mb-2 h-12 w-12" style={{ color: TOKENS.textMuted }} />
            <p className="text-sm" style={{ color: TOKENS.textMuted }}>
              {lista.length === 0
                ? 'No hay departamentos registrados todavía.'
                : 'No hay departamentos activos. Activa "Mostrar desactivados" para verlos.'}
            </p>
          </div>
        )}

        {!isLoading && !isError && filas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${TOKENS.border}` }}>
                  {COLUMNAS.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: TOKENS.textLight, letterSpacing: '0.05em' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((depto) => {
                  const cantidadHijos = hijosActivos.get(depto.id) || 0;
                  // Preventivo de RN-22: el único de los tres bloqueos que se
                  // puede saber desde el cliente. Cargos y empleados no tienen
                  // endpoint de conteo, así que ésos los rechaza el backend.
                  const bloqueadoPorHijos = cantidadHijos > 0;

                  return (
                    <tr
                      key={depto.id}
                      style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}
                      className={depto.activo ? undefined : 'opacity-60'}
                    >
                      <td
                        className="px-3 py-4 font-semibold"
                        style={{
                          color: TOKENS.textDark,
                          paddingLeft: 12 + depto.nivel * SANGRIA_POR_NIVEL,
                        }}
                      >
                        <span className="flex items-center gap-1.5">
                          {depto.nivel > 0 && (
                            <span aria-hidden="true" style={{ color: TOKENS.textMuted }}>
                              └
                            </span>
                          )}
                          {depto.nombre}
                        </span>
                      </td>

                      <td className="px-3 py-4 font-mono text-[13px]" style={{ color: TOKENS.textMid }}>
                        {depto.codigo}
                      </td>

                      <td className="px-3 py-4" style={{ color: TOKENS.textMid }}>
                        {cantidadHijos > 0 ? (
                          cantidadHijos
                        ) : (
                          <span style={{ color: TOKENS.textMuted }}>—</span>
                        )}
                      </td>

                      <td className="px-3 py-4">
                        {depto.activo ? (
                          <Badge texto="Activo" fondo={TOKENS.successLight} color={TOKENS.success} />
                        ) : (
                          <Badge texto="Desactivado" fondo="#F1F5F9" color={TOKENS.textLight} />
                        )}
                      </td>

                      <td className="px-3 py-4">
                        {puedeGestionar ? (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setModal(depto)}
                              title="Editar departamento"
                              aria-label={`Editar ${depto.nombre}`}
                              className="transition hover:opacity-70"
                              style={{ color: TOKENS.primary }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            {depto.activo ? (
                              confirmandoBaja === depto.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => desactivar(depto)}
                                    disabled={desactivarMutation.isPending}
                                    title="Confirmar desactivación"
                                    className="transition hover:opacity-70 disabled:opacity-50"
                                    style={{ color: TOKENS.success }}
                                  >
                                    {desactivarMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmandoBaja(null)}
                                    title="Cancelar"
                                    className="transition hover:opacity-70"
                                    style={{ color: TOKENS.danger }}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmandoBaja(depto.id)}
                                  disabled={bloqueadoPorHijos}
                                  title={
                                    bloqueadoPorHijos
                                      ? `No se puede desactivar: tiene ${cantidadHijos} subdepartamento(s) activo(s). Desactívalos o muévelos a otra rama primero.`
                                      : 'Desactivar departamento'
                                  }
                                  aria-label={`Desactivar ${depto.nombre}`}
                                  className="transition hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
                                  style={{ color: TOKENS.danger }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => reactivar(depto)}
                                disabled={reactivarMutation.isPending}
                                title="Reactivar departamento"
                                aria-label={`Reactivar ${depto.nombre}`}
                                className="transition hover:opacity-70 disabled:opacity-50"
                                style={{ color: TOKENS.success }}
                              >
                                {reactivarMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: TOKENS.textMuted }}>—</span>
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

      {/* Se monta sólo cuando está abierto, y con una key distinta por
          departamento: así su estado interno se reinicia sin necesitar un
          useEffect que llame a setState (que dispara el error
          react-hooks/set-state-in-effect de ESLint). */}
      {modal && (
        <DepartamentoModal
          key={modal === 'nuevo' ? 'nuevo' : modal.id}
          departamento={modal === 'nuevo' ? null : modal}
          departamentos={lista}
          onCerrar={() => setModal(null)}
          onGuardado={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default Departamentos;
