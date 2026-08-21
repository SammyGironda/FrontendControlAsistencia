import { useMemo } from 'react';
import { AlertCircle, LoaderCircle, TrendingUp } from 'lucide-react';

import { formatFecha, formatMoneda, aNumero } from '../../lib/formatters';
import { useAjustesDeDecreto } from '../../hooks/useAjustesSalariales';
import { useEmpleadosParaNombres } from '../../hooks/useUsuarios';

const COLUMNAS = ['EMPLEADO', 'SALARIO ANTERIOR', 'SALARIO NUEVO', 'INCREMENTO', 'VIGENTE DESDE', 'APROBADO POR'];

/**
 * Trazabilidad pedida para la pantalla de decretos: qué AjusteSalarial se
 * generaron bajo los tramos de este decreto.
 *
 * Resuelve nombres de empleado cruzando contra el catálogo COMPLETO
 * (useEmpleadosParaNombres, que incluye a los dados de baja) porque un
 * ajuste histórico puede referenciar a un empleado que hoy ya no está activo
 * — la misma lección que dejó la corrección de Usuarios del 2026-08-18.
 */
const AjustesDeDecretoModal = ({ decreto, onCerrar }) => {
  const { data: ajustes, isLoading, isError } = useAjustesDeDecreto(decreto.id);
  const { data: empleados } = useEmpleadosParaNombres();

  const nombrePorEmpleado = useMemo(() => {
    const mapa = new Map();
    (Array.isArray(empleados) ? empleados : []).forEach((e) => {
      mapa.set(e.id, `${e.nombres} ${e.apellidos}`);
    });
    return mapa;
  }, [empleados]);

  const lista = Array.isArray(ajustes) ? ajustes : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-7 shadow-2xl">
        <div className="flex items-start gap-3 border-l-4 border-[#03178C] pl-3">
          <TrendingUp className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#03178C]" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Ajustes generados bajo {decreto.referencia_decreto}
            </h3>
            <p className="text-[13px] text-[#718096]">
              Año {decreto.anio} · vigencia desde {formatFecha(decreto.fecha_vigencia)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          {isLoading && (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando ajustes…
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-3 rounded-lg bg-[#FFF5F5] p-4 text-[#731B07]">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-semibold">No se pudieron cargar los ajustes de este decreto.</span>
            </div>
          )}

          {!isLoading && !isError && lista.length === 0 && (
            <p className="py-8 text-center text-sm text-[#CBD5E0]">
              Este decreto todavía no generó ningún ajuste salarial.
            </p>
          )}

          {!isLoading && !isError && lista.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    {COLUMNAS.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((ajuste) => {
                    const anterior = aNumero(ajuste.salario_anterior);
                    const nuevo = aNumero(ajuste.salario_nuevo);
                    const incrementoPct = anterior > 0 ? ((nuevo - anterior) / anterior) * 100 : 0;

                    return (
                      <tr key={ajuste.id} className="border-b border-[#F7FAFC]">
                        <td className="px-3 py-3 font-semibold text-[#1A202C]">
                          {nombrePorEmpleado.get(ajuste.id_empleado) || `Empleado ${ajuste.id_empleado}`}
                        </td>
                        <td className="px-3 py-3 text-[#4A5568]">{formatMoneda(anterior)}</td>
                        <td className="px-3 py-3 font-semibold text-[#03178C]">{formatMoneda(nuevo)}</td>
                        <td className="px-3 py-3 text-[#376644]">+{incrementoPct.toFixed(2)} %</td>
                        <td className="px-3 py-3 text-[#4A5568]">{formatFecha(ajuste.fecha_vigencia)}</td>
                        <td className="px-3 py-3 text-[#718096]">
                          {ajuste.id_aprobado_por
                            ? nombrePorEmpleado.get(ajuste.id_aprobado_por) || `Empleado ${ajuste.id_aprobado_por}`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AjustesDeDecretoModal;
