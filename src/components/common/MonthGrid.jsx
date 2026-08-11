import { useMemo } from 'react';
import { format, getDay, getDaysInMonth, isToday } from 'date-fns';

// Grid mensual compartido. Extraido de pages/asistencia/AsistenciaPage.jsx,
// donde vivia inline, para que la pantalla de Vacaciones lo reutilice en vez
// de construir un calendario nuevo.
//
// Props:
//   anio            number | string   ej. 2026
//   mes             number | string   1..12 (no 0..11)
//   renderDia       (date, dayKey) => ReactNode   contenido de la celda
//   getEstiloCelda  (date, dayKey) => { backgroundColor?, borderColor? }
//   emptyState      ReactNode   se muestra si el mes no resuelve a ninguna fecha
//
// El calendario arranca en lunes: getDay() devuelve 0 para domingo, asi que
// (getDay + 6) % 7 convierte domingo en 6 y corre el resto un lugar.

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const COLOR_HOY = '#03178C';
const COLOR_BORDE = '#F7FAFC';
const COLOR_FONDO = '#F8FAFC';

const construirDiasDelMes = (anio, mes) => {
  const anioNum = Number(anio);
  const mesNum = Number(mes);

  if (!Number.isFinite(anioNum) || !Number.isFinite(mesNum)) {
    return [];
  }

  const primerDia = new Date(anioNum, mesNum - 1, 1);
  const diasEnMes = getDaysInMonth(primerDia);
  const vaciasIniciales = (getDay(primerDia) + 6) % 7;

  return Array.from({ length: vaciasIniciales + diasEnMes }, (_, index) => {
    if (index < vaciasIniciales) {
      return null;
    }
    return new Date(anioNum, mesNum - 1, index - vaciasIniciales + 1);
  });
};

const MonthGrid = ({ anio, mes, renderDia, getEstiloCelda, emptyState = null }) => {
  const dias = useMemo(() => construirDiasDelMes(anio, mes), [anio, mes]);

  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-7">
        {DIAS_SEMANA.map((dia) => (
          <div
            key={dia}
            className="text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#718096]"
          >
            {dia}
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-7">
        {dias.map((date, index) => {
          if (!date) {
            return (
              <div key={`empty-${index}`} className="min-h-[98px] rounded-[8px] bg-[#F8FAFC] p-3" />
            );
          }

          const dayKey = format(date, 'yyyy-MM-dd');
          const estilo = getEstiloCelda ? getEstiloCelda(date, dayKey) || {} : {};
          const esHoy = isToday(date);

          return (
            <div
              key={dayKey}
              className="min-h-[98px] rounded-[8px] border border-[#F7FAFC] p-3"
              style={{
                backgroundColor: estilo.backgroundColor || COLOR_FONDO,
                borderColor: esHoy ? COLOR_HOY : estilo.borderColor || COLOR_BORDE,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#4A5568]">{format(date, 'd')}</span>
              </div>
              <div className="mt-2 space-y-1">{renderDia ? renderDia(date, dayKey) : null}</div>
            </div>
          );
        })}
      </div>
      {dias.filter(Boolean).length === 0 && emptyState}
    </div>
  );
};

export default MonthGrid;
