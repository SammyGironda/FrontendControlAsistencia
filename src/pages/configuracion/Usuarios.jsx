import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  KeyRound,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
  UserX,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../../components/layout/PageHeader';
import PasswordTemporalModal from '../../components/common/PasswordTemporalModal';
import NuevoUsuarioModal from './NuevoUsuarioModal';
import useAuthStore from '../../store/authStore';
import { esAdmin } from '../../lib/permisos';
import { formatFechaHora } from '../../lib/formatters';
import {
  mensajeDeError,
  useEliminarUsuario,
  useEmpleadosParaNombres,
  useResetearPassword,
  useRolesCatalogo,
  useToggleActivoUsuario,
  useUsuarios,
} from '../../hooks/useUsuarios';

const TOKENS = {
  primary: '#03178C',
  success: '#376644',
  successLight: '#F0FFF4',
  danger: '#731B07',
  dangerLight: '#FFF5F5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  textDark: '#1A202C',
  textMid: '#4A5568',
  textLight: '#718096',
  textMuted: '#CBD5E0',
  border: '#E2E8F0',
  borderLight: '#F7FAFC',
};

const COLUMNAS = ['USUARIO', 'EMPLEADO', 'ROL', 'ESTADO', 'CONTRASEÑA', 'ÚLTIMO ACCESO', 'ACCIONES'];

const Badge = ({ texto, fondo, color }) => (
  <span
    className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
    style={{ backgroundColor: fondo, color }}
  >
    {texto}
  </span>
);

// Toda esta pantalla es admin-only: crear cuentas, restablecer contraseñas y
// eliminarlas son endpoints `require_admin`. El backend deja que rrhh haga el
// GET del padrón, pero no tendría ninguna acción disponible, así que se cierra
// entera en vez de mostrarle una tabla de solo lectura.
//
// Como siempre, esto es COSMÉTICO: la autorización real la aplica el backend.
const Usuarios = () => {
  const { user } = useAuthStore();

  if (!esAdmin(user)) return <SinPermiso />;

  return <PanelUsuarios user={user} />;
};

const SinPermiso = () => (
  <div className="space-y-5 p-6">
    <div className="flex flex-col items-center gap-3 rounded-[12px] border border-[#E2E8F0] bg-white px-6 py-14 text-center shadow-sm">
      <ShieldAlert className="h-8 w-8 text-[#CBD5E0]" />
      <h1 className="text-[18px] font-semibold text-[#1A202C]">
        No tienes permiso para ver esta sección
      </h1>
      <p className="max-w-md text-[13px] text-[#718096]">
        La gestión de cuentas de acceso está reservada al rol
        <strong> admin</strong>.
      </p>
    </div>
  </div>
);

const PanelUsuarios = ({ user }) => {
  const [modalAltaAbierto, setModalAltaAbierto] = useState(false);
  // { username, password, esReseteo } — se llena tanto al crear como al resetear.
  const [passwordAMostrar, setPasswordAMostrar] = useState(null);
  const [confirmandoReseteo, setConfirmandoReseteo] = useState(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(null);

  const { data: usuarios, isLoading, isError } = useUsuarios();
  const { data: empleados } = useEmpleadosParaNombres();
  const { data: roles } = useRolesCatalogo();

  const resetearMutation = useResetearPassword();
  const toggleMutation = useToggleActivoUsuario();
  const eliminarMutation = useEliminarUsuario();

  const listaUsuarios = useMemo(
    () => (Array.isArray(usuarios) ? usuarios : []),
    [usuarios]
  );

  // UsuarioRead trae `id_empleado` e `id_rol`, no los nombres: hay que cruzarlos
  // a mano. (EmpleadoResponse tampoco expone `nombre_completo` — existe como
  // @property del modelo SQLAlchemy, que Pydantic no serializa.)
  const nombrePorEmpleado = useMemo(() => {
    const mapa = new Map();
    (Array.isArray(empleados) ? empleados : []).forEach((e) => {
      mapa.set(e.id, `${e.nombres} ${e.apellidos}`);
    });
    return mapa;
  }, [empleados]);

  const nombrePorRol = useMemo(() => {
    const mapa = new Map();
    (Array.isArray(roles) ? roles : []).forEach((r) => mapa.set(r.id, r.nombre));
    return mapa;
  }, [roles]);

  const resetear = async (usuario) => {
    try {
      const resultado = await resetearMutation.mutateAsync(usuario.id);
      setConfirmandoReseteo(null);
      setPasswordAMostrar({
        username: resultado.username,
        password: resultado.password_temporal,
        esReseteo: true,
      });
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo restablecer la contraseña.'));
    }
  };

  const alternarActivo = async (usuario) => {
    try {
      await toggleMutation.mutateAsync(usuario.id);
      toast.success(
        usuario.activo
          ? `La cuenta "${usuario.username}" quedó desactivada.`
          : `La cuenta "${usuario.username}" quedó activa.`
      );
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo cambiar el estado de la cuenta.'));
    }
  };

  const eliminar = async (usuario) => {
    try {
      await eliminarMutation.mutateAsync(usuario.id);
      setConfirmandoBorrado(null);
      toast.success(`Cuenta "${usuario.username}" eliminada.`);
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo eliminar la cuenta.'));
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Usuarios del Sistema"
        subtitle="Cuentas de acceso, niveles de permiso y contraseñas"
      />

      <section className="max-w-6xl rounded-xl bg-white p-7 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="border-l-4 pl-3" style={{ borderColor: TOKENS.primary }}>
              <h3 className="text-lg font-bold" style={{ color: TOKENS.textDark }}>
                Cuentas registradas
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setModalAltaAbierto(true)}
              className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: TOKENS.primary }}
            >
              <Plus className="h-4 w-4" />
              Nueva cuenta
            </button>
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
                No se pudieron cargar los usuarios
              </span>
            </div>
          )}

          {!isLoading && !isError && listaUsuarios.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8">
              <UsersIcon className="mb-2 h-12 w-12" style={{ color: TOKENS.textMuted }} />
              <p className="text-sm" style={{ color: TOKENS.textMuted }}>
                No hay cuentas registradas todavía.
              </p>
            </div>
          )}

          {!isLoading && !isError && listaUsuarios.length > 0 && (
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
                  {listaUsuarios.map((usuario) => {
                    const esMiCuenta = usuario.id === user?.id;

                    return (
                      <tr
                        key={usuario.id}
                        style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}
                      >
                        <td className="px-3 py-4 font-semibold" style={{ color: TOKENS.textDark }}>
                          {usuario.username}
                          {esMiCuenta && (
                            <span
                              className="ml-2 text-[11px] font-normal"
                              style={{ color: TOKENS.textLight }}
                            >
                              (tú)
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-4" style={{ color: TOKENS.textMid }}>
                          {nombrePorEmpleado.get(usuario.id_empleado) || (
                            <span style={{ color: TOKENS.textMuted }}>Sin empleado vinculado</span>
                          )}
                        </td>

                        <td className="px-3 py-4" style={{ color: TOKENS.textMid }}>
                          {nombrePorRol.get(usuario.id_rol) || `Rol ${usuario.id_rol}`}
                        </td>

                        <td className="px-3 py-4">
                          {usuario.activo ? (
                            <Badge
                              texto="Activo"
                              fondo={TOKENS.successLight}
                              color={TOKENS.success}
                            />
                          ) : (
                            <Badge
                              texto="Inactivo"
                              fondo={TOKENS.dangerLight}
                              color={TOKENS.danger}
                            />
                          )}
                        </td>

                        <td className="px-3 py-4">
                          {usuario.requiere_cambio_password ? (
                            <Badge
                              texto="Temporal"
                              fondo={TOKENS.warningLight}
                              color={TOKENS.warning}
                            />
                          ) : (
                            <span className="text-sm" style={{ color: TOKENS.textLight }}>
                              Definida
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-4 text-sm" style={{ color: TOKENS.textMid }}>
                          {usuario.ultimo_acceso ? (
                            formatFechaHora(usuario.ultimo_acceso)
                          ) : (
                            <span style={{ color: TOKENS.textMuted }}>Nunca ingresó</span>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                              {/* Restablecer contraseña */}
                              {confirmandoReseteo === usuario.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => resetear(usuario)}
                                    disabled={resetearMutation.isPending}
                                    title="Confirmar restablecimiento"
                                    className="transition hover:opacity-70 disabled:opacity-50"
                                    style={{ color: TOKENS.success }}
                                  >
                                    {resetearMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmandoReseteo(null)}
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
                                  onClick={() => setConfirmandoReseteo(usuario.id)}
                                  title="Restablecer contraseña"
                                  aria-label={`Restablecer contraseña de ${usuario.username}`}
                                  className="transition hover:opacity-70"
                                  style={{ color: TOKENS.primary }}
                                >
                                  <KeyRound className="h-4 w-4" />
                                </button>
                              )}

                              {/* Activar / desactivar. No sobre la propia cuenta:
                                  desactivarse a sí mismo produce 401 en la
                                  siguiente request y expulsa de la sesión. */}
                              <button
                                type="button"
                                onClick={() => alternarActivo(usuario)}
                                disabled={esMiCuenta || toggleMutation.isPending}
                                title={
                                  esMiCuenta
                                    ? 'No puedes desactivar tu propia cuenta'
                                    : usuario.activo
                                    ? 'Desactivar cuenta'
                                    : 'Activar cuenta'
                                }
                                className="transition hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
                                style={{ color: TOKENS.textLight }}
                              >
                                <UserX className="h-4 w-4" />
                              </button>

                              {/* Eliminar (hard delete en el backend) */}
                              {confirmandoBorrado === usuario.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => eliminar(usuario)}
                                    disabled={eliminarMutation.isPending}
                                    title="Confirmar eliminación"
                                    className="transition hover:opacity-70 disabled:opacity-50"
                                    style={{ color: TOKENS.success }}
                                  >
                                    {eliminarMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmandoBorrado(null)}
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
                                  onClick={() => setConfirmandoBorrado(usuario.id)}
                                  disabled={esMiCuenta}
                                  title={
                                    esMiCuenta
                                      ? 'No puedes eliminar tu propia cuenta'
                                      : 'Eliminar cuenta'
                                  }
                                  aria-label={`Eliminar la cuenta ${usuario.username}`}
                                  className="transition hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
                                  style={{ color: TOKENS.danger }}
                                >
                                  <Trash2 className="h-4 w-4" />
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

      {/* Se monta sólo cuando está abierto, y así su estado interno se reinicia
          al cerrarlo sin necesitar un useEffect que llame a setState (que dispara
          el error react-hooks/set-state-in-effect de ESLint). */}
      {modalAltaAbierto && (
        <NuevoUsuarioModal
          usuariosExistentes={listaUsuarios}
          onCerrar={() => setModalAltaAbierto(false)}
          onCreada={(cuenta) => {
            setModalAltaAbierto(false);
            setPasswordAMostrar({
              username: cuenta.username,
              password: cuenta.password_temporal,
              esReseteo: false,
            });
          }}
        />
      )}

      {passwordAMostrar && (
        <PasswordTemporalModal
          username={passwordAMostrar.username}
          password={passwordAMostrar.password}
          esReseteo={passwordAMostrar.esReseteo}
          onClose={() => setPasswordAMostrar(null)}
        />
      )}
    </div>
  );
};

export default Usuarios;
