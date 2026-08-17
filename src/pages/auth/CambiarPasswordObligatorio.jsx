import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, Lock, LoaderCircle, LogOut, ShieldAlert, X } from 'lucide-react';
import { cambiarPasswordObligatorio, getCurrentUser } from '../../api/auth';
import useAuthStore from '../../store/authStore';

// Espeja validar_password_fuerte de app/features/auth/usuario/schemas.py. Se
// repite acá para poder mostrar los requisitos en vivo mientras el usuario
// escribe; la validación que MANDA sigue siendo la del backend, que responde
// 422 si esta copia quedara desactualizada.
const REQUISITOS = [
  { texto: 'Al menos 8 caracteres', cumple: (v) => v.length >= 8 },
  { texto: 'Una letra mayúscula', cumple: (v) => /[A-Z]/.test(v) },
  { texto: 'Una letra minúscula', cumple: (v) => /[a-z]/.test(v) },
  { texto: 'Un número', cumple: (v) => /\d/.test(v) },
];

const CambiarPasswordObligatorio = () => {
  const navigate = useNavigate();
  const { token, user, setAuth, logout } = useAuthStore();

  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [verPasswords, setVerPasswords] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const requisitosCumplidos = REQUISITOS.filter((r) => r.cumple(passwordNueva));
  const cumpleTodo = requisitosCumplidos.length === REQUISITOS.length;
  const coincide = passwordNueva.length > 0 && passwordNueva === confirmacion;
  const esIgualALaActual = passwordNueva.length > 0 && passwordNueva === passwordActual;

  const puedeEnviar =
    passwordActual.length > 0 && cumpleTodo && coincide && !esIgualALaActual && !cargando;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;

    setCargando(true);
    setError('');

    try {
      await cambiarPasswordObligatorio(passwordActual, passwordNueva);

      // El backend ya bajó requiere_cambio_password, pero el `user` del store
      // sigue siendo el de antes. Sin este refresco el guard de PrivateRoute
      // volvería a mandar acá en la siguiente navegación.
      //
      // El token NO cambia: cambiar la contraseña no reemite el JWT, así que se
      // reutiliza el que ya estaba.
      const usuarioActualizado = await getCurrentUser();
      setAuth(token, usuarioActualizado);

      navigate('/', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 422) {
        // FastAPI devuelve el 422 como array de objetos, no como string:
        // pintarlo crudo mostraría "[object Object]".
        setError(
          Array.isArray(detail)
            ? detail.map((d) => d.msg || JSON.stringify(d)).join('. ')
            : 'La contraseña nueva no cumple los requisitos.'
        );
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('No se pudo cambiar la contraseña. Intenta de nuevo.');
      }
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F2F2] p-4 font-sans">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#FFFBEB]">
            <ShieldAlert className="h-5 w-5 text-[#D97706]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Cambia tu contraseña</h1>
            <p className="mt-1 text-sm text-slate-500">
              Tu cuenta usa una contraseña temporal. Para continuar, elige una
              contraseña nueva que solo tú conozcas.
            </p>
          </div>
        </div>

        {user?.username && (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Sesión iniciada como{' '}
            <span className="font-semibold text-slate-900">{user.username}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="mb-4">
            <label
              className="mb-2 block text-sm font-medium text-gray-700"
              htmlFor="password-actual"
            >
              Contraseña temporal actual
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={verPasswords ? 'text' : 'password'}
                id="password-actual"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#D9A404]"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label
              className="mb-2 block text-sm font-medium text-gray-700"
              htmlFor="password-nueva"
            >
              Contraseña nueva
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={verPasswords ? 'text' : 'password'}
                id="password-nueva"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#D9A404]"
                required
              />
              <button
                type="button"
                onClick={() => setVerPasswords((prev) => !prev)}
                title={verPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                aria-label={verPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {verPasswords ? (
                  <EyeOff className="h-5 w-5 text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>

            <ul className="mt-3 space-y-1">
              {REQUISITOS.map((requisito) => {
                const ok = requisito.cumple(passwordNueva);
                return (
                  <li
                    key={requisito.texto}
                    className={`flex items-center gap-2 text-xs ${
                      ok ? 'text-[#376644]' : 'text-slate-400'
                    }`}
                  >
                    {ok ? (
                      <Check className="h-3.5 w-3.5 flex-shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 flex-shrink-0" />
                    )}
                    {requisito.texto}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mb-6">
            <label
              className="mb-2 block text-sm font-medium text-gray-700"
              htmlFor="password-confirmacion"
            >
              Repite la contraseña nueva
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={verPasswords ? 'text' : 'password'}
                id="password-confirmacion"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#D9A404]"
                required
              />
            </div>
            {confirmacion.length > 0 && !coincide && (
              <p className="mt-1.5 text-xs text-[#731B07]">
                Las dos contraseñas no coinciden.
              </p>
            )}
          </div>

          {esIgualALaActual && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              La contraseña nueva debe ser distinta de la temporal.
            </p>
          )}

          <button
            type="submit"
            disabled={!puedeEnviar}
            className="flex w-full items-center justify-center rounded-lg bg-[#D9A404] px-4 py-3 font-semibold text-[#03178C] shadow-sm transition-colors duration-200 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-[#D9A404] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? (
              <LoaderCircle className="h-6 w-6 animate-spin" />
            ) : (
              'Guardar y continuar'
            )}
          </button>

          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
        </form>

        {/* Sin esta salida el usuario queda atrapado: esta pantalla no tiene
            barra lateral y el guard de PrivateRoute bloquea toda otra ruta. */}
        <button
          type="button"
          onClick={logout}
          className="mt-6 flex w-full items-center justify-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default CambiarPasswordObligatorio;
