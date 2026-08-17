import { useState } from 'react';
import { Check, Copy, KeyRound, TriangleAlert } from 'lucide-react';

/**
 * Muestra la contraseña temporal recién generada, con botón de copiar.
 *
 * Lo usan las dos pantallas que la producen: el alta de una cuenta y el reseteo.
 * Es deliberadamente insistente con que este es el ÚNICO momento en que la
 * contraseña existe legible — el backend solo guarda su hash bcrypt, así que si
 * el admin cierra sin anotarla, la única salida es volver a resetear.
 *
 * Por eso el modal NO se cierra al hacer clic afuera ni con Escape: sólo con el
 * botón explícito "Ya la comuniqué".
 *
 * Este archivo no debe exportar nada además del componente: romper eso dispara
 * el error react-refresh/only-export-components de ESLint.
 */
const PasswordTemporalModal = ({ username, password, onClose, esReseteo = false }) => {
  const [copiado, setCopiado] = useState(false);
  const [errorCopia, setErrorCopia] = useState('');

  const copiar = async () => {
    setErrorCopia('');
    try {
      // navigator.clipboard sólo existe en contexto seguro (https o localhost).
      // En una IP de red local sin HTTPS es undefined, y sin este chequeo el
      // botón fallaría con un TypeError en vez de avisar.
      if (!navigator.clipboard) {
        throw new Error('sin portapapeles');
      }
      await navigator.clipboard.writeText(password);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErrorCopia('No se pudo copiar automáticamente. Selecciona la contraseña y cópiala a mano.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-md rounded-xl bg-white p-7 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#F0FFF4]">
            <KeyRound className="h-5 w-5 text-[#376644]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {esReseteo ? 'Contraseña restablecida' : 'Cuenta creada'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {esReseteo
                ? 'Entrega esta contraseña temporal al usuario.'
                : 'La cuenta quedó lista. Entrega estos datos al usuario.'}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Usuario
            </p>
            <p className="mt-1 select-all font-mono text-base font-semibold text-slate-900">
              {username}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contraseña temporal
            </p>
            <div className="mt-1 flex items-center gap-2">
              {/* select-all: un clic selecciona toda la contraseña, para el
                  caso en que el botón de copiar no esté disponible. */}
              <code className="flex-1 select-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-lg tracking-wide text-slate-900">
                {password}
              </code>
              <button
                type="button"
                onClick={copiar}
                title="Copiar contraseña"
                aria-label="Copiar contraseña"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              >
                {copiado ? (
                  <Check className="h-5 w-5 text-[#376644]" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
            {copiado && (
              <p className="mt-1.5 text-xs font-semibold text-[#376644]">
                Copiada al portapapeles
              </p>
            )}
            {errorCopia && (
              <p className="mt-1.5 text-xs text-[#731B07]">{errorCopia}</p>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Anótala ahora.</span> No se vuelve a
              mostrar: el sistema solo guarda una versión cifrada. Si la pierdes,
              tendrás que restablecerla de nuevo.
            </p>
          </div>

          <p className="text-sm text-slate-500">
            El usuario deberá cambiarla la primera vez que inicie sesión.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#03178C] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Ya la comuniqué
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordTemporalModal;
