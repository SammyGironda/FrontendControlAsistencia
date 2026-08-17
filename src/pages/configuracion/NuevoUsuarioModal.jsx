import { useMemo, useState } from 'react';
import { Info, LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import SelectField from '../../components/common/SelectField';
import {
  mensajeDeError,
  useCrearUsuario,
  useEmpleadosParaCuenta,
  useRolesCatalogo,
} from '../../hooks/useUsuarios';

// Espeja ROLES_ASIGNABLES de app/features/auth/usuario/services.py. Los roles
// `empleado` y `consulta` existen en la base pero el backend rechaza con 400
// crearles una cuenta: todavía no hay pantallas de autoservicio, así que
// entrarían al sistema para recibir 403 en casi todo.
const ROLES_ASIGNABLES = ['admin', 'rrhh', 'supervisor'];

// El backend no acepta un empleado en estado `baja`. El resto sí, pero conviene
// que se vea en la opción con qué estado se está creando la cuenta.
const ETIQUETA_ESTADO = {
  por_habilitar: ' (por habilitar)',
  suspendido: ' (suspendido)',
};

const NuevoUsuarioModal = ({ usuariosExistentes = [], onCerrar, onCreada }) => {
  const [idEmpleado, setIdEmpleado] = useState('');
  const [idRol, setIdRol] = useState('');

  const { data: empleados, isLoading: cargandoEmpleados } = useEmpleadosParaCuenta();
  const { data: roles, isLoading: cargandoRoles } = useRolesCatalogo();
  const crearMutation = useCrearUsuario();

  // Un empleado sólo puede tener una cuenta (`usuario.id_empleado` es UNIQUE), y
  // el backend devuelve 400 si ya la tiene. Se filtran acá para no ofrecer una
  // opción que va a fallar.
  const empleadosDisponibles = useMemo(() => {
    const lista = Array.isArray(empleados) ? empleados : [];
    const yaTienenCuenta = new Set(
      usuariosExistentes.map((u) => u.id_empleado).filter(Boolean)
    );

    return lista
      .filter((e) => !yaTienenCuenta.has(e.id))
      .sort((a, b) =>
        `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`)
      );
  }, [empleados, usuariosExistentes]);

  const rolesDisponibles = useMemo(() => {
    const lista = Array.isArray(roles) ? roles : [];
    return lista.filter(
      (r) => ROLES_ASIGNABLES.includes((r.nombre || '').toLowerCase()) && r.activo !== false
    );
  }, [roles]);

  const empleadoElegido = empleadosDisponibles.find((e) => String(e.id) === idEmpleado);

  const puedeEnviar = Boolean(idEmpleado && idRol) && !crearMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;

    try {
      const cuenta = await crearMutation.mutateAsync({
        id_empleado: Number(idEmpleado),
        id_rol: Number(idRol),
        activo: true,
      });
      // El padre es quien muestra la contraseña temporal: este modal se
      // desmonta y no debe seguir siendo el dueño de ese dato.
      onCreada(cuenta);
    } catch (error) {
      toast.error(mensajeDeError(error, 'No se pudo crear la cuenta.'));
    }
  };

  const cargando = cargandoEmpleados || cargandoRoles;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-7 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">Nueva cuenta de usuario</h3>
        <p className="mt-1 text-sm text-slate-500">
          Elige el empleado y su nivel de acceso. El sistema genera el nombre de
          usuario y una contraseña temporal.
        </p>

        {cargando ? (
          <div className="flex justify-center py-10">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#03178C]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* SelectField recibe las opciones como children y pasa el EVENTO a
                onChange, no el valor. */}
            <SelectField
              label="Empleado"
              value={idEmpleado}
              onChange={(e) => setIdEmpleado(e.target.value)}
            >
              <option value="">Selecciona un empleado</option>
              {empleadosDisponibles.map((emp) => (
                <option key={emp.id} value={String(emp.id)}>
                  {`${emp.nombres} ${emp.apellidos}${ETIQUETA_ESTADO[emp.estado] || ''}`}
                </option>
              ))}
            </SelectField>

            {empleadosDisponibles.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Todos los empleados registrados ya tienen una cuenta. Da de alta
                al empleado primero, en la pantalla de Empleados.
              </p>
            )}

            <SelectField
              label="Nivel de acceso"
              value={idRol}
              onChange={(e) => setIdRol(e.target.value)}
            >
              <option value="">Selecciona un rol</option>
              {rolesDisponibles.map((rol) => (
                <option key={rol.id} value={String(rol.id)}>
                  {rol.nombre}
                </option>
              ))}
            </SelectField>

            <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-[#EBF4FF] p-3">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#03178C]" />
              <div className="text-sm text-slate-600">
                <p>
                  El nombre de usuario se arma como{' '}
                  <span className="font-semibold">nombre.apellido</span>
                  {empleadoElegido && (
                    <>
                      {' '}— para {empleadoElegido.nombres} {empleadoElegido.apellidos} será
                      algo como{' '}
                      <span className="font-mono font-semibold text-slate-900">
                        {`${(empleadoElegido.nombres || '').trim().split(/\s+/)[0]}.${
                          (empleadoElegido.apellidos || '').trim().split(/\s+/)[0]
                        }`.toLowerCase()}
                      </span>
                    </>
                  )}
                  .
                </p>
                <p className="mt-1.5">
                  La contraseña temporal se muestra una sola vez al crear la
                  cuenta. El usuario deberá cambiarla en su primer ingreso.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCerrar}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!puedeEnviar}
                className="flex items-center gap-2 rounded-lg bg-[#03178C] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {crearMutation.isPending && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Crear cuenta
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default NuevoUsuarioModal;
