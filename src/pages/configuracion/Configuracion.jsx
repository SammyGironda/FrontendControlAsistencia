import { useState } from 'react';
import { addMinutes, parse, format } from 'date-fns';
import {
  Info,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CalendarOff,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Header from '../../components/layout/Header';
import { useHorarios, useCreateHorario, useUpdateHorario, useDeleteHorario } from '../../hooks/useHorarios';

const DAY_LABELS = [
  { short: 'L', long: 'Lun', value: 1 },
  { short: 'M', long: 'Mar', value: 2 },
  { short: 'X', long: 'Mié', value: 3 },
  { short: 'J', long: 'Jue', value: 4 },
  { short: 'V', long: 'Vie', value: 5 },
  { short: 'S', long: 'Sáb', value: 6 },
  { short: 'D', long: 'Dom', value: 7 },
];

const TOKENS = {
  primary: '#03178C',
  primaryLight: '#EBF4FF',
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
  bg: '#F8FAFC',
  white: '#FFFFFF',
};

const ToggleSwitch = ({ enabled, onToggle, label, description }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div>
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-[#03178C]' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? 'left-5' : 'left-0.5'}`}
      />
    </button>
  </div>
);

const DayPill = ({ active, label, value = label, onClick = null }) => (
  <button
    type="button"
    onClick={() => onClick?.(value)}
    className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold transition ${
      active
        ? 'bg-[#03178C] text-white'
        : 'bg-[#F7FAFC] text-[#CBD5E0]'
    } ${onClick ? 'cursor-pointer' : ''}`}
  >
    {label}
  </button>
);

const Configuracion = () => {
  // Estado para tolerancia
  const [toleranciaMinutos, setTolereciaMinutos] = useState(10);
  const [aplicarSalida, setAplicarSalida] = useState(false);
  const [guardandoTolerancia, setGuardandoTolerancia] = useState(false);
  const [deletingHorarioId, setDeletingHorarioId] = useState(null);

  // Estado del modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [horarioEnEdicion, setHorarioEnEdicion] = useState(null);
  const [erroresValidacion, setErroresValidacion] = useState({});

  // Estado del formulario modal
  const [formHorario, setFormHorario] = useState({
    nombre: '',
    tipo_jornada: 'continua',
    hora_entrada: '08:00',
    hora_salida: '17:00',
    tolerancia_minutos: 5,
    jornada_semanal_horas: 8,
    dias_laborables: [1, 2, 3, 4, 5],
  });

  // Hooks de React Query
  const { data: horariosData = [], isLoading, isError } = useHorarios();
  const createMutation = useCreateHorario();
  const updateMutation = useUpdateHorario();
  const deleteMutation = useDeleteHorario();

  // Calcular la nota informativa dinámica
  const calcularNotaInformativa = () => {
    if (horariosData.length === 0) return null;
    const primerHorario = horariosData[0];
    if (!primerHorario.hora_entrada) return null;

    try {
      const entrada = parse(primerHorario.hora_entrada, 'HH:mm', new Date());
      const salida = addMinutes(entrada, toleranciaMinutos);
      const horaFormato = format(salida, 'HH:mm');
      return {
        hora: horaFormato,
        nombre: primerHorario.nombre || 'primer turno',
      };
    } catch {
      return null;
    }
  };

  const notaInfo = calcularNotaInformativa();

  // Abrir modal de crear
  const abrirCrear = () => {
    setModoEdicion(false);
    setHorarioEnEdicion(null);
    setFormHorario({
      nombre: '',
      tipo_jornada: 'continua',
      hora_entrada: '08:00',
      hora_salida: '17:00',
      tolerancia_minutos: 5,
      jornada_semanal_horas: 8,
      dias_laborables: [1, 2, 3, 4, 5],
    });
    setErroresValidacion({});
    setModalAbierto(true);
  };

  // Abrir modal de editar
  const abrirEditar = (horario) => {
    setModoEdicion(true);
    setHorarioEnEdicion(horario);
    setFormHorario({
      nombre: horario.nombre || '',
      tipo_jornada: horario.tipo_jornada || 'continua',
      hora_entrada: horario.hora_entrada || '08:00',
      hora_salida: horario.hora_salida || '17:00',
      tolerancia_minutos: horario.tolerancia_minutos || 5,
      jornada_semanal_horas: horario.jornada_semanal_horas || 8,
      dias_laborables: Array.isArray(horario.dias_laborables) ? horario.dias_laborables : [1, 2, 3, 4, 5],
    });
    setErroresValidacion({});
    setModalAbierto(true);
  };

  // Validar formulario
  const validarFormulario = () => {
    const errores = {};

    if (!formHorario.nombre.trim()) {
      errores.nombre = 'El nombre del turno es requerido';
    }

    if (!formHorario.hora_entrada) {
      errores.hora_entrada = 'La hora de entrada es requerida';
    }

    if (!formHorario.hora_salida) {
      errores.hora_salida = 'La hora de salida es requerida';
    }

    // Validar que salida > entrada
    if (formHorario.hora_entrada && formHorario.hora_salida) {
      const entrada = parse(formHorario.hora_entrada, 'HH:mm', new Date());
      const salida = parse(formHorario.hora_salida, 'HH:mm', new Date());
      if (salida <= entrada) {
        errores.hora_salida = 'La hora de salida debe ser posterior a la hora de entrada';
      }
    }

    if (formHorario.dias_laborables.length === 0) {
      errores.dias_laborables = 'Al menos un día debe estar seleccionado';
    }

    setErroresValidacion(errores);
    return Object.keys(errores).length === 0;
  };

  // Guardar horario
  const guardarHorario = async () => {
    if (!validarFormulario()) return;

    try {
      if (modoEdicion) {
        // Actualizar
        await updateMutation.mutateAsync({
          horarioId: horarioEnEdicion.id,
          data: formHorario,
        });
        toast.success('Turno actualizado');
      } else {
        // Crear
        await createMutation.mutateAsync(formHorario);
        toast.success('Turno creado');
      }
      setModalAbierto(false);
    } catch (error) {
      toast.error(error.message || 'Error al guardar el turno');
    }
  };

  // Guardar tolerancia en todos los horarios
  const guardarTolerancia = async () => {
    if (horariosData.length === 0) {
      toast.error('No hay horarios configurados');
      return;
    }

    setGuardandoTolerancia(true);
    const errores = [];

    try {
      for (const horario of horariosData) {
        try {
          await updateMutation.mutateAsync({
            horarioId: horario.id,
            data: {
              ...horario,
              tolerancia_minutos: toleranciaMinutos,
            },
          });
        } catch {
          errores.push(horario.nombre || `Turno ${horario.id}`);
        }
      }

      if (errores.length === 0) {
        toast.success('Tolerancia actualizada en todos los turnos');
      } else {
        toast.error(`Error al actualizar tolerancia en: ${errores.join(', ')}`);
      }
    } finally {
      setGuardandoTolerancia(false);
    }
  };

  // Eliminar horario
  const confirmarEliminar = async (horarioId) => {
    try {
      await deleteMutation.mutateAsync(horarioId);
      setDeletingHorarioId(null);
      toast.success('Turno eliminado');
    } catch (error) {
      toast.error(error.message || 'Error al eliminar el turno');
    }
  };

  const toggleDay = (dayValue) => {
    setFormHorario((prev) => ({
      ...prev,
      dias_laborables: prev.dias_laborables.includes(dayValue)
        ? prev.dias_laborables.filter((d) => d !== dayValue)
        : [...prev.dias_laborables, dayValue].sort((a, b) => a - b),
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Configuración del Sistema" subtitle="Reglas de asistencia, turnos y parámetros del sistema RRHH" />

      <div className="px-4 py-5 lg:px-6">
        <div className="mb-6">
          <h2 className="text-[22px] font-bold text-slate-900">Configuración del Sistema</h2>
          <p className="text-sm text-slate-500">Reglas de asistencia, turnos y parámetros del sistema RRHH</p>
        </div>

        <div className="space-y-5 max-w-4xl">
          {/* CARD 1: REGLAS DE ASISTENCIA */}
          <section
            className="rounded-xl bg-white p-7 shadow-sm"
            style={{
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div className="mb-6 border-l-4 pl-3" style={{ borderColor: TOKENS.primary }}>
              <h3 className="text-lg font-bold" style={{ color: TOKENS.textDark }}>
                Reglas de Asistencia
              </h3>
            </div>

            <div className="space-y-6">
              {/* Bloque Margen de Tolerancia */}
              <div>
                <p className="text-sm font-semibold" style={{ color: TOKENS.textDark }}>
                  Margen de Tolerancia
                </p>
                <p className="mt-1 text-sm" style={{ color: TOKENS.textLight }}>
                  Los empleados que lleguen dentro de este margen NO serán marcados como 'Retraso' en los reportes
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="flex items-center justify-center font-bold text-white shadow-sm"
                    style={{
                      width: '48px',
                      height: '40px',
                      backgroundColor: TOKENS.primary,
                      borderRadius: '8px',
                    }}
                  >
                    {toleranciaMinutos}
                  </div>
                  <span className="text-sm" style={{ color: TOKENS.textLight }}>
                    min
                  </span>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={toleranciaMinutos}
                  onChange={(e) => setTolereciaMinutos(Number(e.target.value))}
                  className="mt-4 w-full accent-[#03178C]"
                  style={{
                    height: '4px',
                    borderRadius: '2px',
                  }}
                />

                {/* Marcas debajo del slider */}
                <div className="mt-2 flex justify-between text-[11px]" style={{ color: TOKENS.textLight }}>
                  {['0', '5', '10', '15', '20', '25', '30'].map((mark) => (
                    <span key={mark}>{mark}</span>
                  ))}
                </div>

                {/* Nota informativa */}
                {notaInfo && (
                  <div
                    className="mt-3 flex items-start gap-2 rounded-lg border p-3"
                    style={{
                      backgroundColor: TOKENS.primaryLight,
                      borderColor: '#BEE3F8',
                    }}
                  >
                    <Info className="mt-0.5 h-3.5 w-3.5" style={{ color: TOKENS.primary, flexShrink: 0 }} />
                    <p className="text-sm" style={{ color: TOKENS.textMid }}>
                      llegadas hasta las{' '}
                      <span className="font-bold" style={{ color: TOKENS.primary }}>
                        {notaInfo.hora}
                      </span>{' '}
                      serán marcadas como asistencia normal
                    </p>
                  </div>
                )}
              </div>

              {/* Toggle salida */}
              <div className="border-t pt-5" style={{ borderColor: '#F0F0F0' }}>
                <ToggleSwitch
                  enabled={aplicarSalida}
                  onToggle={() => setAplicarSalida((prev) => !prev)}
                  label="Aplicar tolerancia en horario de salida también"
                  description="Si activo, los empleados que salgan X min antes del horario no serán penalizados"
                />
              </div>

              {/* Botón Guardar */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={guardarTolerancia}
                  disabled={guardandoTolerancia}
                  className="flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
                  style={{
                    backgroundColor: guardandoTolerancia ? '#999' : TOKENS.primary,
                  }}
                >
                  {guardandoTolerancia ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Configuración'
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* CARD 2: HORARIOS Y TURNOS */}
          <section
            className="rounded-xl bg-white p-7 shadow-sm"
            style={{
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="border-l-4 pl-3" style={{ borderColor: TOKENS.primary }}>
                <h3 className="text-lg font-bold" style={{ color: TOKENS.textDark }}>
                  Horarios y Turnos
                </h3>
              </div>
              <button
                type="button"
                onClick={abrirCrear}
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: TOKENS.primary }}
              >
                <Plus className="h-4 w-4" />
                Nuevo Turno
              </button>
            </div>

            {/* Estados de carga/error */}
            {isLoading && (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded bg-slate-200 animate-pulse"
                    style={{ backgroundColor: TOKENS.border }}
                  />
                ))}
              </div>
            )}

            {isError && (
              <div
                className="flex items-center gap-3 rounded-lg p-4"
                style={{
                  backgroundColor: TOKENS.dangerLight,
                  color: TOKENS.danger,
                }}
              >
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-semibold">No se pudieron cargar los horarios</span>
              </div>
            )}

            {!isLoading && !isError && horariosData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8">
                <CalendarOff className="h-12 w-12 mb-2" style={{ color: TOKENS.textMuted }} />
                <p className="text-sm" style={{ color: TOKENS.textMuted }}>
                  No hay turnos configurados. Crea el primero.
                </p>
              </div>
            )}

            {/* Tabla de horarios */}
            {!isLoading && !isError && horariosData.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${TOKENS.border}` }}>
                      {['NOMBRE', 'TIPO', 'H. ENTRADA', 'H. SALIDA', 'TOLERANCIA', 'DÍAS ACTIVOS', 'ACCIONES'].map((col) => (
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
                    {horariosData.map((horario) => (
                      <tr
                        key={horario.id}
                        style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}
                      >
                        {/* NOMBRE */}
                        <td className="px-3 py-4 font-semibold" style={{ color: TOKENS.textDark }}>
                          {horario.nombre}
                        </td>

                        {/* TIPO */}
                        <td className="px-3 py-4">
                          <span
                            className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                            style={{
                              backgroundColor: horario.tipo_jornada === 'continua' ? TOKENS.successLight : TOKENS.warningLight,
                              color: horario.tipo_jornada === 'continua' ? TOKENS.success : TOKENS.warning,
                            }}
                          >
                            {horario.tipo_jornada === 'continua' ? 'Continuo' : 'Discontinuo'}
                          </span>
                        </td>

                        {/* HORA ENTRADA */}
                        <td className="px-3 py-4" style={{ color: TOKENS.textDark }}>
                          {horario.hora_entrada}
                        </td>

                        {/* HORA SALIDA */}
                        <td className="px-3 py-4" style={{ color: TOKENS.textDark }}>
                          {horario.hora_salida}
                        </td>

                        {/* TOLERANCIA */}
                        <td
                          className="px-3 py-4 text-sm"
                          style={{
                            color:
                              horario.tolerancia_minutos === toleranciaMinutos
                                ? TOKENS.primary
                                : TOKENS.textMid,
                            fontWeight:
                              horario.tolerancia_minutos === toleranciaMinutos ? 600 : 400,
                          }}
                        >
                          {horario.tolerancia_minutos} min
                        </td>

                        {/* DÍAS ACTIVOS */}
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-1">
                            {DAY_LABELS.map((day) => (
                              <span
                                key={day.value}
                                className="inline-flex items-center justify-center rounded text-[11px] font-semibold"
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  backgroundColor: horario.dias_laborables.includes(day.value)
                                    ? TOKENS.primary
                                    : TOKENS.borderLight,
                                  color: horario.dias_laborables.includes(day.value)
                                    ? TOKENS.white
                                    : TOKENS.textMuted,
                                }}
                              >
                                {day.short}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* ACCIONES */}
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => abrirEditar(horario)}
                              style={{ color: TOKENS.textLight }}
                              className="transition hover:opacity-70"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {deletingHorarioId === horario.id ? (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => confirmarEliminar(horario.id)}
                                  style={{ color: TOKENS.success }}
                                  className="transition hover:opacity-70"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingHorarioId(null)}
                                  style={{ color: TOKENS.danger }}
                                  className="transition hover:opacity-70"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingHorarioId(horario.id)}
                                style={{ color: TOKENS.danger }}
                                className="transition hover:opacity-70"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* MODAL CREAR/EDITAR HORARIO */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-7 shadow-2xl"
            style={{ borderRadius: '12px' }}
          >
            <div className="mb-6">
              <h3 className="text-lg font-bold" style={{ color: TOKENS.textDark }}>
                {modoEdicion ? 'Editar Turno' : 'Nuevo Turno'}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Nombre */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold" style={{ color: TOKENS.textDark }}>
                  Nombre del turno
                </span>
                <input
                  type="text"
                  value={formHorario.nombre}
                  onChange={(e) =>
                    setFormHorario((prev) => ({
                      ...prev,
                      nombre: e.target.value,
                    }))
                  }
                  placeholder="Ej: Turno Mañana"
                  className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
                  style={{
                    borderColor: erroresValidacion.nombre ? TOKENS.danger : TOKENS.border,
                    focusRingColor: TOKENS.primary,
                  }}
                />
                {erroresValidacion.nombre && (
                  <span className="text-xs" style={{ color: TOKENS.danger }}>
                    {erroresValidacion.nombre}
                  </span>
                )}
              </label>

              {/* Tipo de jornada */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold" style={{ color: TOKENS.textDark }}>
                  Tipo de jornada
                </span>
                <select
                  value={formHorario.tipo_jornada}
                  onChange={(e) =>
                    setFormHorario((prev) => ({
                      ...prev,
                      tipo_jornada: e.target.value,
                    }))
                  }
                  className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: TOKENS.border }}
                >
                  <option value="continua">Continua</option>
                  <option value="discontinua">Discontinua</option>
                </select>
              </label>

              {/* Hora entrada */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold" style={{ color: TOKENS.textDark }}>
                  Hora de entrada
                </span>
                <input
                  type="time"
                  value={formHorario.hora_entrada}
                  onChange={(e) =>
                    setFormHorario((prev) => ({
                      ...prev,
                      hora_entrada: e.target.value,
                    }))
                  }
                  className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
                  style={{
                    borderColor: erroresValidacion.hora_entrada ? TOKENS.danger : TOKENS.border,
                  }}
                />
                {erroresValidacion.hora_entrada && (
                  <span className="text-xs" style={{ color: TOKENS.danger }}>
                    {erroresValidacion.hora_entrada}
                  </span>
                )}
              </label>

              {/* Hora salida */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold" style={{ color: TOKENS.textDark }}>
                  Hora de salida
                </span>
                <input
                  type="time"
                  value={formHorario.hora_salida}
                  onChange={(e) =>
                    setFormHorario((prev) => ({
                      ...prev,
                      hora_salida: e.target.value,
                    }))
                  }
                  className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
                  style={{
                    borderColor: erroresValidacion.hora_salida ? TOKENS.danger : TOKENS.border,
                  }}
                />
                {erroresValidacion.hora_salida && (
                  <span className="text-xs" style={{ color: TOKENS.danger }}>
                    {erroresValidacion.hora_salida}
                  </span>
                )}
              </label>

              {/* Tolerancia */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold" style={{ color: TOKENS.textDark }}>
                  Tolerancia (min)
                </span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={formHorario.tolerancia_minutos}
                  onChange={(e) =>
                    setFormHorario((prev) => ({
                      ...prev,
                      tolerancia_minutos: Number(e.target.value),
                    }))
                  }
                  className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: TOKENS.border }}
                />
              </label>

              {/* Jornada semanal */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold" style={{ color: TOKENS.textDark }}>
                  Horas semanales
                </span>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={formHorario.jornada_semanal_horas}
                  onChange={(e) =>
                    setFormHorario((prev) => ({
                      ...prev,
                      jornada_semanal_horas: Number(e.target.value),
                    }))
                  }
                  className="h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: TOKENS.border }}
                />
              </label>

              {/* Días laborables */}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold" style={{ color: TOKENS.textDark }}>
                  Días laborables
                </span>
                <div className="flex flex-wrap gap-2">
                  {DAY_LABELS.map((day) => (
                    <DayPill
                      key={day.value}
                      label={day.long}
                      active={formHorario.dias_laborables.includes(day.value)}
                      value={day.value}
                      onClick={toggleDay}
                    />
                  ))}
                </div>
                {erroresValidacion.dias_laborables && (
                  <span className="text-xs" style={{ color: TOKENS.danger }}>
                    {erroresValidacion.dias_laborables}
                  </span>
                )}
              </label>
            </div>

            {/* Botones */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="rounded-lg border px-5 py-2.5 text-sm font-semibold transition hover:opacity-80"
                style={{
                  borderColor: TOKENS.border,
                  color: TOKENS.textMid,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarHorario}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
                style={{
                  backgroundColor: TOKENS.primary,
                }}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : modoEdicion ? (
                  'Actualizar'
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracion;
