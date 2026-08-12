import { useState } from 'react';
import { AlertCircle, Check, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  useHorarioPersonalizado,
  useGuardarHorarioPersonalizado,
  useDesactivarHorarioPersonalizado,
} from '../../hooks/useHorarioPersonalizado';

const TOLERANCIA_MIN = 0;
const TOLERANCIA_MAX = 180; // el override admite hasta 180; el horario general tope en 60

const inputClass =
  'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

const borde = (hayError) => (hayError ? 'border-red-400' : 'border-gray-300 focus:border-primary');

// El backend solo acepta "HH:MM" exacto (field_validator del schema parte el
// string y espera 2 componentes), asi que recortamos un eventual "HH:MM:SS".
const aHoraONull = (valor) => (valor ? valor.slice(0, 5) : null);

const Campo = ({ label, hint, error, children }) => (
  <div>
    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
    {children}
    {error ? (
      <p className="mt-1 text-xs text-red-600">{error}</p>
    ) : hint ? (
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    ) : null}
  </div>
);

/**
 * Formulario del override. Recibe `override` ya resuelto (puede ser null) y
 * arranca su estado con inicializadores perezosos de useState.
 *
 * Se separa del componente de arriba a proposito: asi el estado nace correcto
 * en el primer render, sin un useEffect que llame setState (que dispararia el
 * error react-hooks/set-state-in-effect de ESLint).
 */
const FormularioOverride = ({ empleadoId, override }) => {
  const [usarPersonalizado, setUsarPersonalizado] = useState(() => Boolean(override));
  const [form, setForm] = useState(() => ({
    // Todo se guarda como string para que los inputs sean controlados sin
    // warnings; la conversion a numero se hace recien al construir el payload.
    tolerancia_minutos:
      override?.tolerancia_minutos === null || override?.tolerancia_minutos === undefined
        ? ''
        : String(override.tolerancia_minutos),
    hora_entrada: override?.hora_entrada ?? '', // el backend ya lo serializa como "HH:MM"
    hora_salida: override?.hora_salida ?? '',
    salida_flexible: override?.salida_flexible ?? false,
    observacion: override?.observacion ?? '',
  }));
  const [errores, setErrores] = useState({});

  const guardar = useGuardarHorarioPersonalizado(empleadoId);
  const desactivar = useDesactivarHorarioPersonalizado(empleadoId);
  const enviando = guardar.isPending || desactivar.isPending;

  const actualizar = (campo, valor) => {
    setForm((previo) => ({ ...previo, [campo]: valor }));
    setErrores((previo) => ({ ...previo, [campo]: undefined, general: undefined }));
  };

  // Marcar salida flexible obliga a limpiar la hora de salida: el
  // model_validator del backend responde 422 si vienen las dos juntas.
  const cambiarSalidaFlexible = (marcado) => {
    setForm((previo) => ({
      ...previo,
      salida_flexible: marcado,
      hora_salida: marcado ? '' : previo.hora_salida,
    }));
    setErrores((previo) => ({ ...previo, hora_salida: undefined, general: undefined }));
  };

  // Valida en el cliente lo que el backend devolveria como 422 ilegible.
  const validar = () => {
    const nuevos = {};
    const { tolerancia_minutos: tolerancia, hora_entrada: entrada, hora_salida: salida } = form;

    if (tolerancia !== '') {
      const numero = Number(tolerancia);
      if (!Number.isInteger(numero) || numero < TOLERANCIA_MIN || numero > TOLERANCIA_MAX) {
        nuevos.tolerancia_minutos = `Debe ser un número entero entre ${TOLERANCIA_MIN} y ${TOLERANCIA_MAX}.`;
      }
    }

    // Comparacion de strings "HH:MM", que ordenan lexicograficamente igual que
    // cronologicamente.
    if (!form.salida_flexible && entrada && salida && salida <= entrada) {
      nuevos.hora_salida = 'La hora de salida debe ser posterior a la de entrada.';
    }

    if (tolerancia === '' && !entrada && !salida && !form.salida_flexible) {
      nuevos.general =
        'Completá al menos un campo. Un horario personalizado sin valores no cambiaría nada respecto al horario general.';
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const onGuardar = () => {
    if (usarPersonalizado) {
      if (!validar()) return;

      // El PUT no hace merge parcial: hay que mandar SIEMPRE los 6 campos.
      guardar.mutate({
        tolerancia_minutos: form.tolerancia_minutos === '' ? null : Number(form.tolerancia_minutos),
        hora_entrada: aHoraONull(form.hora_entrada),
        hora_salida: form.salida_flexible ? null : aHoraONull(form.hora_salida),
        salida_flexible: form.salida_flexible,
        // Fijo en true: reactivar un override desactivado se hace con este mismo
        // PUT, porque el service reutiliza la fila existente sin filtrar por activo.
        activo: true,
        observacion: form.observacion.trim() || null,
      });
    } else if (override) {
      // Solo tiene sentido llamar al DELETE si hay algo activo que desactivar.
      desactivar.mutate();
    }
  };

  const sinCambios = !usarPersonalizado && !override;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900">Horario personalizado</h3>
      </div>

      {override ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs font-semibold text-amber-800">Horario personalizado activo</div>
          <div className="mt-1 text-xs text-amber-700">
            {override.hora_entrada ? `Entrada ${override.hora_entrada}` : 'Entrada según horario general'}
            {' · '}
            {override.salida_flexible
              ? 'Salida flexible'
              : override.hora_salida
                ? `Salida ${override.hora_salida}`
                : 'Salida según horario general'}
            {' · '}
            {override.tolerancia_minutos === null || override.tolerancia_minutos === undefined
              ? 'Tolerancia según horario general'
              : `Tolerancia ${override.tolerancia_minutos} min`}
          </div>
          {override.updated_at_lapaz ? (
            <div className="mt-1 text-[11px] text-amber-600">
              Última modificación: {format(new Date(override.updated_at_lapaz), 'dd/MM/yyyy HH:mm')}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Toggle. No dispara nada por si solo: los cambios se aplican con el boton Guardar. */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {[
          { valor: false, texto: 'Usar horario general' },
          { valor: true, texto: 'Horario personalizado' },
        ].map((opcion) => {
          const activo = usarPersonalizado === opcion.valor;
          return (
            <button
              key={opcion.texto}
              type="button"
              onClick={() => {
                setUsarPersonalizado(opcion.valor);
                setErrores({});
              }}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activo
                  ? 'border-2 border-primary bg-blue-50 text-primary'
                  : 'border border-gray-200 bg-white text-slate-600 hover:border-primary'
              }`}
            >
              {opcion.texto}
            </button>
          );
        })}
      </div>

      {usarPersonalizado ? (
        <div className="grid gap-4">
          <Campo
            label="Tolerancia de llegada (minutos)"
            hint={`Dejalo vacío para heredar la tolerancia del horario general. Máximo ${TOLERANCIA_MAX}.`}
            error={errores.tolerancia_minutos}
          >
            <input
              type="number"
              min={TOLERANCIA_MIN}
              max={TOLERANCIA_MAX}
              step={1}
              value={form.tolerancia_minutos}
              onChange={(e) => actualizar('tolerancia_minutos', e.target.value)}
              placeholder="Ej: 15"
              className={`${inputClass} ${borde(errores.tolerancia_minutos)}`}
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Hora de entrada" error={errores.hora_entrada}>
              <input
                type="time"
                value={form.hora_entrada}
                onChange={(e) => actualizar('hora_entrada', e.target.value)}
                className={`${inputClass} ${borde(errores.hora_entrada)}`}
              />
            </Campo>

            <Campo
              label="Hora de salida"
              hint={form.salida_flexible ? 'Deshabilitada por salida flexible.' : undefined}
              error={errores.hora_salida}
            >
              <input
                type="time"
                value={form.hora_salida}
                disabled={form.salida_flexible}
                onChange={(e) => actualizar('hora_salida', e.target.value)}
                className={`${inputClass} ${borde(errores.hora_salida)}`}
              />
            </Campo>
          </div>

          <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.salida_flexible}
                onChange={(e) => cambiarSalidaFlexible(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>
                <span className="font-medium">Salida flexible</span>
                <div className="mt-1 text-xs text-slate-500">
                  El empleado puede retirarse sin una hora de salida fija.{' '}
                  <span className="font-medium text-slate-600">No afecta el cálculo del salario</span> —
                  solo cambia las estadísticas de horas trabajadas. Al activarla, la hora de salida
                  queda deshabilitada porque el sistema no admite ambas a la vez.
                </div>
              </span>
            </label>
          </div>

          <Campo label="Observación">
            <textarea
              rows={2}
              maxLength={500}
              value={form.observacion}
              onChange={(e) => actualizar('observacion', e.target.value)}
              placeholder="Ej: Ingreso diferido autorizado por Gerencia"
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Campo>

          {errores.general ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-xs text-red-700">{errores.general}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          {override
            ? 'Al guardar, este empleado dejará de tener horario personalizado y volverá a regirse por el horario general de arriba. El registro anterior se conserva como historial.'
            : 'Este empleado se rige por el horario general que se muestra arriba.'}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onGuardar}
          disabled={enviando || sinCambios}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {enviando ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
              Guardando...
            </span>
          ) : (
            <>
              <Check className="mr-2 h-3.5 w-3.5" />
              Guardar horario
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/**
 * Seccion de horario personalizado del empleado (solo admin).
 *
 * Espera a que la query resuelva antes de montar el formulario, para que este
 * pueda inicializar su estado directo desde los datos.
 */
const HorarioPersonalizadoSection = ({ empleadoId }) => {
  const { data: override, isLoading, isError, error, refetch } = useHorarioPersonalizado(empleadoId);

  if (isLoading) {
    return <div className="text-sm text-slate-500">Cargando horario personalizado...</div>;
  }

  if (isError) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <div className="text-xs text-red-700">
          <p>{error?.response?.data?.detail || 'No se pudo cargar el horario personalizado.'}</p>
          <button type="button" onClick={() => refetch()} className="mt-1 font-semibold underline">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return <FormularioOverride empleadoId={empleadoId} override={override ?? null} />;
};

export default HorarioPersonalizadoSection;
