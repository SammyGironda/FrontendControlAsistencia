import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  Info,
  Minus,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import toast from 'react-hot-toast';

import Header from '../../components/layout/Header';

dayjs.locale('es');

const DAY_LABELS = [
  { short: 'L', long: 'Lun', value: 1 },
  { short: 'M', long: 'Mar', value: 2 },
  { short: 'X', long: 'Mié', value: 3 },
  { short: 'J', long: 'Jue', value: 4 },
  { short: 'V', long: 'Vie', value: 5 },
  { short: 'S', long: 'Sáb', value: 6 },
  { short: 'D', long: 'Dom', value: 7 },
];

const INITIAL_TURNOS = [
  {
    id: 1,
    nombre: 'Turno Mañana',
    tipo: 'Continuo',
    entrada: '08:00',
    salida: '17:00',
    diasActivos: [1, 2, 3, 4, 5],
    tolerancia: '',
  },
  {
    id: 2,
    nombre: 'Turno Tarde',
    tipo: 'Continuo',
    entrada: '14:00',
    salida: '22:00',
    diasActivos: [1, 2, 3, 4, 5],
    tolerancia: '10',
  },
  {
    id: 3,
    nombre: 'Turno Noche',
    tipo: 'Continuo',
    entrada: '22:00',
    salida: '06:00',
    diasActivos: [1, 2, 3, 4, 5, 6],
    tolerancia: '15',
  },
  {
    id: 4,
    nombre: 'Turno Flex',
    tipo: 'Discontinuo',
    entrada: '09:00',
    salida: '18:00',
    diasActivos: [1, 2, 3, 4, 5],
    tolerancia: '5',
  },
];

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

const DayPill = ({ active, label, compact = false }) => (
  <span
    className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold ${
      active ? 'bg-[#03178C] text-white' : 'bg-[#F7FAFC] text-slate-300'
    } ${compact ? 'min-w-[1.5rem]' : ''}`}
  >
    {label}
  </span>
);

const Configuracion = () => {
  const [margenTolerancia, setMargenTolerancia] = useState(10);
  const [aplicarSalida, setAplicarSalida] = useState(false);
  const [notificarHuérfanas, setNotificarHuérfanas] = useState(true);
  const [turnos, setTurnos] = useState(INITIAL_TURNOS);
  const [modalOpen, setModalOpen] = useState(false);
  const [turnoEditandoId, setTurnoEditandoId] = useState(null);
  const [formTurno, setFormTurno] = useState({
    nombre: '',
    tipo: 'Continuo',
    entrada: '08:00',
    salida: '17:00',
    diasActivos: [1, 2, 3, 4, 5],
    tolerancia: '',
  });

  const infoCards = useMemo(() => [
    { label: 'Versión', value: 'v10.0', dot: null },
    { label: 'Base de datos', value: 'PostgreSQL', state: 'conectado' },
    { label: 'Backend', value: 'FastAPI', state: 'conectado' },
    { label: 'Último backup', value: dayjs().subtract(2, 'day').format('DD/MM/YYYY HH:mm'), dot: null },
  ], []);

  const legalData = [
    { title: 'SMN vigente', value: 'Bs. 2.362', note: 'DS 5188' },
    { title: 'AFP Laboral', value: '12.71%' },
    { title: 'RC-IVA', value: '13%' },
    { title: 'AFP Patronal Pro-Vivienda', value: '3%' },
  ];

  const openCreateModal = () => {
    setTurnoEditandoId(null);
    setFormTurno({
      nombre: '',
      tipo: 'Continuo',
      entrada: '08:00',
      salida: '17:00',
      diasActivos: [1, 2, 3, 4, 5],
      tolerancia: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (turno) => {
    setTurnoEditandoId(turno.id);
    setFormTurno({
      nombre: turno.nombre,
      tipo: turno.tipo,
      entrada: turno.entrada,
      salida: turno.salida,
      diasActivos: turno.diasActivos,
      tolerancia: turno.tolerancia,
    });
    setModalOpen(true);
  };

  const saveTurno = () => {
    if (!formTurno.nombre.trim()) {
      toast.error('Completa el nombre del turno.');
      return;
    }

    setTurnos((current) => {
      if (turnoEditandoId) {
        return current.map((turno) => (turno.id === turnoEditandoId ? { ...turno, ...formTurno } : turno));
      }

      return [
        ...current,
        {
          id: Date.now(),
          ...formTurno,
        },
      ];
    });

    toast.success('Turno guardado.');
    setModalOpen(false);
  };

  const toggleDay = (value) => {
    setFormTurno((current) => ({
      ...current,
      diasActivos: current.diasActivos.includes(value)
        ? current.diasActivos.filter((item) => item !== value)
        : [...current.diasActivos, value].sort((left, right) => left - right),
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

        <div className="grid gap-5 xl:grid-cols-[60%_40%]">
          <div className="space-y-5">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-6 border-l-4 border-[#03178C] pl-3">
                <h3 className="text-lg font-bold text-slate-900">Reglas de Asistencia</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Margen de Tolerancia para Retrasos</h4>
                  <p className="mt-1 text-sm text-slate-500">Empleados que lleguen dentro de este margen no serán marcados como Retraso</p>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="inline-flex items-center rounded-lg bg-[#03178C] px-4 py-2 text-2xl font-bold text-white shadow-sm">
                      {margenTolerancia}
                    </div>
                    <span className="text-sm text-slate-500">min</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMargenTolerancia((current) => Math.max(0, current - 1))}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#03178C]"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMargenTolerancia((current) => Math.min(30, current + 1))}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#03178C]"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={margenTolerancia}
                    onChange={(event) => setMargenTolerancia(Number(event.target.value))}
                    className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#03178C]"
                  />

                  <div className="mt-3 grid grid-cols-7 text-center text-[11px] text-slate-400">
                    {['0', '5', '10', '15', '20', '25', '30'].map((mark) => (
                      <span key={mark}>{mark}</span>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-[#BEE3F8] bg-[#EBF4FF] p-3">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 text-[#03178C]" />
                      <p className="text-sm text-slate-600">
                        Con este ajuste: llegadas hasta las <span className="font-bold text-[#03178C]">08:10</span> serán marcadas como asistencia normal.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-200 pt-5">
                  <ToggleSwitch
                    enabled={aplicarSalida}
                    onToggle={() => setAplicarSalida((current) => !current)}
                    label="Aplicar tolerancia también en hora de salida"
                    description="Si se activa, los empleados que salgan antes del horario no serán penalizados dentro del margen definido."
                  />

                  <ToggleSwitch
                    enabled={notificarHuérfanas}
                    onToggle={() => setNotificarHuérfanas((current) => !current)}
                    label="Notificar al supervisor por marcaciones huérfanas"
                    description="Envía una alerta cuando solo existe entrada o salida en el registro del día."
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => toast.success('Configuración guardada.')}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#03178C] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021266]"
                  >
                    <Save className="h-4 w-4" />
                    Guardar cambios
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="border-l-4 border-[#03178C] pl-3">
                  <h3 className="text-lg font-bold text-slate-900">Turnos y Horarios</h3>
                </div>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#03178C] px-4 py-2 text-sm font-semibold text-[#03178C] transition hover:bg-[#EBF4FF]"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Turno
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                      {['Nombre', 'Entrada', 'Salida', 'Tipo', 'Días', 'Acciones'].map((column) => (
                        <th key={column} className="px-2 py-3 font-semibold first:pl-0 last:pr-0">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {turnos.map((turno) => (
                      <tr key={turno.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-2 py-4 pl-0 font-medium text-slate-900">{turno.nombre}</td>
                        <td className="px-2 py-4 text-slate-700">{turno.entrada}</td>
                        <td className="px-2 py-4 text-slate-700">{turno.salida}</td>
                        <td className="px-2 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              turno.tipo === 'Continuo' ? 'bg-[#F0FFF4] text-[#376644]' : 'bg-[#FFFBEB] text-[#D97706]'
                            }`}
                          >
                            {turno.tipo}
                          </span>
                        </td>
                        <td className="px-2 py-4">
                          <div className="flex flex-wrap gap-1">
                            {DAY_LABELS.map((day) => (
                              <DayPill key={day.value} label={day.short} active={turno.diasActivos.includes(day.value)} compact />
                            ))}
                          </div>
                        </td>
                        <td className="px-2 py-4 pr-0">
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => openEditModal(turno)} className="text-slate-400 transition hover:text-slate-700">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" className="text-[#731B07] transition hover:text-[#5d1605]">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Información del Sistema</h3>

              <div className="space-y-3">
                {infoCards.map((item) => (
                  <div key={item.label} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <span className="text-sm text-slate-500">{item.label}</span>
                    {item.state ? (
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span className={`h-2.5 w-2.5 rounded-full ${item.state === 'conectado' ? 'bg-[#376644]' : 'bg-[#731B07]'}`} />
                        {item.value}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Datos Legales Bolivia</h3>

              <div className="space-y-3">
                {legalData.map((item) => (
                  <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        {item.note && <p className="text-xs text-slate-500">{item.note}</p>}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Actualiza estos valores en Parámetros de Impuestos cuando el gobierno emita nuevo decreto
              </p>
            </section>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {turnoEditandoId ? 'Editar turno' : 'Nuevo turno'}
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{turnoEditandoId ? 'Nuevo/Editar Turno' : 'Nuevo Turno'}</h3>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 transition hover:text-slate-700">
                <XIcon />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Nombre del turno</span>
                <input
                  value={formTurno.nombre}
                  onChange={(event) => setFormTurno((current) => ({ ...current, nombre: event.target.value }))}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:border-[#03178C] focus:ring-2 focus:ring-[#03178C]/10"
                  placeholder="Ej. Turno Mañana"
                />
              </label>

              <div className="md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Tipo</span>
                <div className="mt-2 flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm">
                    <input
                      type="radio"
                      checked={formTurno.tipo === 'Continuo'}
                      onChange={() => setFormTurno((current) => ({ ...current, tipo: 'Continuo' }))}
                    />
                    Continuo
                  </label>

                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm">
                    <input
                      type="radio"
                      checked={formTurno.tipo === 'Discontinuo'}
                      onChange={() => setFormTurno((current) => ({ ...current, tipo: 'Discontinuo' }))}
                    />
                    <span
                      data-tooltip-id="turno-discontinuo-tooltip"
                      data-tooltip-content="Con pausa de almuerzo no registrada biométricamente"
                      className="underline decoration-dotted underline-offset-4"
                    >
                      Discontinuo
                    </span>
                  </label>
                  <ReactTooltip id="turno-discontinuo-tooltip" place="top" />
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">Hora de entrada</span>
                <input
                  type="time"
                  value={formTurno.entrada}
                  onChange={(event) => setFormTurno((current) => ({ ...current, entrada: event.target.value }))}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:border-[#03178C] focus:ring-2 focus:ring-[#03178C]/10"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">Hora de salida</span>
                <input
                  type="time"
                  value={formTurno.salida}
                  onChange={(event) => setFormTurno((current) => ({ ...current, salida: event.target.value }))}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:border-[#03178C] focus:ring-2 focus:ring-[#03178C]/10"
                />
              </label>

              <div className="md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Días activos</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAY_LABELS.map((day) => (
                    <label key={day.value} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formTurno.diasActivos.includes(day.value)}
                        onChange={() => toggleDay(day.value)}
                      />
                      {day.long}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Tolerancia específica del turno</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={formTurno.tolerancia}
                  onChange={(event) => setFormTurno((current) => ({ ...current, tolerancia: event.target.value }))}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:border-[#03178C] focus:ring-2 focus:ring-[#03178C]/10"
                  placeholder="Hereda la global si queda vacío"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#03178C]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveTurno}
                className="inline-flex items-center gap-2 rounded-lg bg-[#03178C] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021266]"
              >
                <Save className="h-4 w-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const XIcon = () => <span className="text-lg leading-none">×</span>;

export default Configuracion;