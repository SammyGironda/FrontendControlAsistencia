import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Users,
  Eye,
  User,
  Pencil,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../../components/layout/Header';
import {
  crearRol,
  eliminarRol,
  getRoles,
  getUsuariosCountByRol,
  toggleEstadoRol,
  actualizarRol,
} from '../../api/roles';

const ROLE_META = {
  admin: {
    icon: ShieldCheck,
    label: 'Admin',
    badge: { bg: '#FFF5F5', text: '#731B07' },
  },
  rrhh: {
    icon: Users,
    label: 'RRHH',
    badge: { bg: '#EBF4FF', text: '#03178C' },
  },
  supervisor: {
    icon: Eye,
    label: 'Supervisor',
    badge: { bg: '#F0FFF4', text: '#376644' },
  },
  empleado: {
    icon: User,
    label: 'Empleado',
    badge: { bg: '#F7FAFC', text: '#777F8F' },
  },
};

const DEFAULT_FORM = {
  id: null,
  nombre: '',
  descripcion: '',
  activo: true,
};

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [togglingRoleId, setTogglingRoleId] = useState(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await getRoles();
      const withCounts = await Promise.all(
        data.map(async (rol) => {
          try {
            const cantidad_usuarios = await getUsuariosCountByRol(rol.id);
            return { ...rol, usuariosAsignados: cantidad_usuarios };
          } catch {
            return { ...rol, usuariosAsignados: 0 };
          }
        })
      );
      setRoles(withCounts);
    } catch {
      toast.error('No se pudieron cargar los roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const roleMeta = useMemo(() => ({
    admin: ROLE_META.admin,
    rrhh: ROLE_META.rrhh,
    supervisor: ROLE_META.supervisor,
    empleado: ROLE_META.empleado,
  }), []);

  const resetForm = () => {
    setSelectedRole(null);
    setForm(DEFAULT_FORM);
  };

  const handleSelectRole = (rol) => {
    setSelectedRole(rol);
    setForm({
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion || '',
      activo: rol.activo,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre del rol es requerido.');
      return;
    }

    if (!form.descripcion.trim()) {
      toast.error('La descripción del rol es requerida.');
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await actualizarRol(form.id, {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim(),
          activo: form.activo,
        });
        toast.success('Rol actualizado correctamente');
      } else {
        await crearRol({
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim(),
          activo: form.activo,
        });
        toast.success('Rol creado correctamente');
      }
      resetForm();
      await fetchRoles();
    } catch {
      toast.error('No se pudo guardar el rol. Verifica los datos e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    resetForm();
  };

  const handleToggleActivo = async (rol) => {
    if (rol.nombre.toLowerCase() === 'admin') {
      return;
    }

    setTogglingRoleId(rol.id);
    try {
      const updated = await toggleEstadoRol(rol.id);
      setRoles((current) =>
        current.map((item) =>
          item.id === rol.id ? { ...item, activo: updated.activo } : item
        )
      );
      toast.success(
        `Rol ${updated.activo ? 'activado' : 'desactivado'} correctamente`
      );
    } catch {
      toast.error('No se pudo cambiar el estado del rol.');
    } finally {
      setTogglingRoleId(null);
    }
  };

  const openDeleteModal = (rol) => {
    setRoleToDelete(rol);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setRoleToDelete(null);
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;
    setSaving(true);
    try {
      await eliminarRol(roleToDelete.id);
      toast.success('Rol eliminado correctamente');
      if (selectedRole?.id === roleToDelete.id) {
        resetForm();
      }
      await fetchRoles();
      closeDeleteModal();
    } catch {
      toast.error('No se pudo eliminar el rol.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleMetadata = (nombre) => {
    const key = nombre?.toLowerCase();
    return roleMeta[key] || {
      icon: User,
      badge: { bg: '#EDF2F7', text: '#4A5568' },
    };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Roles del Sistema" subtitle="Administración de perfiles de acceso" />

      <div className="px-4 py-5 lg:px-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900">Roles del Sistema</h1>
            <p className="mt-1 text-sm text-slate-500">Administración de perfiles de acceso</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-2 rounded-lg bg-[#03178C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#021266]"
          >
            <Plus className="h-4 w-4" />
            Nuevo Rol
          </button>
        </div>

        <div className="grid gap-5 xl:grid-cols-[60%_40%]">
          <section className="rounded-[12px] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-slate-900">Roles existentes</h2>
              <p className="text-sm text-slate-500">Actualiza el estado y administra los permisos.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['ROL', 'DESCRIPCIÓN', 'EMPLEADOS ASIGNADOS', 'ESTADO', 'ACCIONES'].map((header) => (
                      <th
                        key={header}
                        className="py-4 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#718096]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-sm text-slate-500">
                        Cargando roles...
                      </td>
                    </tr>
                  ) : roles.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-sm text-slate-500">
                        No hay roles registrados.
                      </td>
                    </tr>
                  ) : (
                    roles.map((rol) => {
                      const metadata = getRoleMetadata(rol.nombre);
                      const Icon = metadata.icon;
                      const assigned = rol.usuariosAsignados ?? 0;
                      const isAdmin = rol.nombre.toLowerCase() === 'admin';

                      return (
                        <tr key={rol.id}>
                          <td className="px-6 py-4 align-top">
                            <div className="flex items-center gap-3">
                              <span
                                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                                style={{ backgroundColor: metadata.badge.bg }}
                              >
                                <Icon className="h-4 w-4" style={{ color: metadata.badge.text }} />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{rol.nombre}</p>
                                <span
                                  className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                  style={{ backgroundColor: metadata.badge.bg, color: metadata.badge.text }}
                                >
                                  {rol.nombre}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <p
                              className="text-sm text-slate-600"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'normal',
                                maxWidth: '24rem',
                              }}
                            >
                              {rol.descripcion || 'Sin descripción'}
                            </p>
                          </td>
                          <td className="px-6 py-4 align-top">
                            {assigned > 0 ? (
                              <span className="inline-flex rounded-full bg-[#EBF4FF] px-3 py-1 text-sm font-semibold text-[#03178C]">
                                {assigned}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-600">
                                Sin asignar
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <button
                              type="button"
                              onClick={() => handleToggleActivo(rol)}
                              disabled={isAdmin}
                              title={isAdmin ? 'El rol Admin no puede desactivarse' : 'Cambiar estado del rol'}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                rol.activo ? 'bg-[#03178C]' : 'bg-[#CBD5E0]'
                              } ${isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                            >
                              <span
                                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                  rol.activo ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                              {togglingRoleId === rol.id && (
                                <Loader2 className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-[#03178C] animate-spin" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectRole(rol)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                                title="Editar rol"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(rol)}
                                disabled={assigned > 0}
                                title={
                                  assigned > 0
                                    ? `Hay ${assigned} empleados con este rol`
                                    : 'Eliminar rol'
                                }
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition ${
                                  assigned > 0
                                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                    : 'bg-slate-100 text-rose-600 hover:bg-rose-50'
                                }`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="self-start">
            <div className="sticky top-4 rounded-[12px] bg-white p-6 shadow-sm">
              <div className={`mb-6 border-l-4 pl-4 ${selectedRole ? 'border-[#D9A404]' : 'border-[#03178C]'}`}>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {selectedRole ? 'Editar Rol' : 'Nuevo Rol'}
                </p>
                <h2 className="mt-2 text-lg font-bold text-slate-900">
                  {selectedRole ? `Editar Rol — ${selectedRole.nombre}` : 'Crear nuevo rol'}
                </h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Nombre del Rol
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                    placeholder="Ej: Supervisor de Área"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#03178C] focus:ring-2 focus:ring-[#03178C]/10"
                  />
                  <p className="mt-2 text-xs text-slate-500">El nombre debe ser único en el sistema</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Descripción
                  </label>
                  <textarea
                    value={form.descripcion}
                    onChange={(event) => {
                      const value = event.target.value.slice(0, 255);
                      setForm((current) => ({ ...current, descripcion: value }));
                    }}
                    rows={3}
                    placeholder="Describe las responsabilidades de este rol..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#03178C] focus:ring-2 focus:ring-[#03178C]/10"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Máximo 255 caracteres</span>
                    <span>{form.descripcion.length}/255</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Rol activo</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Los usuarios con rol inactivo no podrán acceder al sistema.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, activo: !current.activo }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        form.activo ? 'bg-[#03178C]' : 'bg-[#CBD5E0]'
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          form.activo ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl bg-[#03178C] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#021266] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Guardar Rol
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {deleteModalOpen && roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="w-full max-w-lg rounded-[16px] bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Confirmar eliminación</h3>
            <p className="mt-3 text-sm text-slate-600">
              ¿Seguro que deseas eliminar el rol <span className="font-semibold text-slate-900">{roleToDelete.nombre}</span>?
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex justify-center rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Eliminar rol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
