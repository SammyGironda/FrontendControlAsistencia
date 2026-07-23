import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Layers,
  ChevronRight,
  RefreshCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../../components/layout/Header';
import { formatFecha } from '../../lib/formatters';
import {
  crearFeriado,
  actualizarFeriado,
  eliminarFeriadoPermanente,
  getFeriados,
  getFeriadosAplicables,
} from '../../api/feriados';

const DEPARTAMENTOS = [
  { value: '', label: 'Todos' },
  { value: 'LP', label: 'La Paz' },
  { value: 'CB', label: 'Cochabamba' },
  { value: 'SC', label: 'Santa Cruz' },
  { value: 'OR', label: 'Oruro' },
  { value: 'PT', label: 'Potosí' },
  { value: 'TJ', label: 'Tarija' },
  { value: 'CH', label: 'Chuquisaca' },
  { value: 'BE', label: 'Beni' },
  { value: 'PD', label: 'Pando' },
];

const AMBITOS = [
  { value: '', label: 'Todos' },
  { value: 'NACIONAL', label: 'Nacional' },
  { value: 'DEPARTAMENTAL', label: 'Departamental' },
];

const DEFAULT_FORM = {
  id: null,
  fecha: '',
  descripcion: '',
  ambito: 'NACIONAL',
  codigo_departamento: '',
  activo: true,
};

const DEFAULT_FILTROS = {
  activo: '',
  ambito: '',
  anio: '',
  codigo_departamento: '',
};

const DEFAULT_APLICABLES = {
  dia: '',
  mes: '',
  codigo_departamento: '',
};

const Feriados = () => {
  const [feriados, setFeriados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState(DEFAULT_FILTROS);
  const [applicableSearch, setApplicableSearch] = useState(DEFAULT_APLICABLES);
  const [applicableResults, setApplicableResults] = useState([]);
  const [showApplicableResults, setShowApplicableResults] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const resumen = useMemo(() => {
    const total = feriados.length;
    const nacionales = feriados.filter((item) => item.ambito === 'NACIONAL').length;
    const departamentales = feriados.filter((item) => item.ambito === 'DEPARTAMENTAL').length;
    const activos = feriados.filter((item) => item.activo).length;
    return { total, nacionales, departamentales, activos };
  }, [feriados]);

  const buildQuery = (params) => {
    return Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== '' && value !== null && value !== undefined
      )
    );
  };

  const fetchFeriados = async (params = {}) => {
    setLoading(true);
    try {
      const query = buildQuery({
        ...params,
        activo:
          params.activo === 'true'
            ? true
            : params.activo === 'false'
            ? false
            : undefined,
      });
      const data = await getFeriados(query);
      setFeriados(data);
    } catch {
      toast.error('No se pudieron cargar los feriados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeriados(filter);
  }, []);

  const handleFilterChange = (field, value) => {
    setFilter((current) => ({ ...current, [field]: value }));
  };

  const handleApplicableChange = (field, value) => {
    setApplicableSearch((current) => ({ ...current, [field]: value }));
  };

  const handleSubmitFilter = async (event) => {
    event.preventDefault();
    await fetchFeriados(filter);
  };

  const handleSearchAplicables = async (event) => {
    event?.preventDefault();

    const { dia, mes, codigo_departamento } = applicableSearch;
    if (!dia || !mes || !codigo_departamento) {
      toast.error('Selecciona día, mes y departamento para buscar feriados aplicables.');
      return;
    }

    try {
      setLoading(true);
      const data = await getFeriadosAplicables(dia, mes, codigo_departamento);
      setApplicableResults(data);
      setShowApplicableResults(true);
    } catch {
      toast.error('No se pudieron cargar los feriados aplicables.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (feriado) => {
    setForm({
      id: feriado.id,
      fecha: feriado.fecha,
      descripcion: feriado.descripcion,
      ambito: feriado.ambito,
      codigo_departamento: feriado.codigo_departamento || '',
      activo: feriado.activo,
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setIsEditing(false);
  };

  const handleSubmitForm = async (event) => {
    event.preventDefault();

    if (!form.fecha || !form.descripcion) {
      toast.error('Completa los campos obligatorios.');
      return;
    }

    if (form.ambito === 'DEPARTAMENTAL' && !form.codigo_departamento) {
      toast.error('Selecciona el departamento para feriado departamental.');
      return;
    }

    const payload = {
      fecha: form.fecha,
      descripcion: form.descripcion,
      ambito: form.ambito,
      codigo_departamento:
        form.ambito === 'NACIONAL' ? null : form.codigo_departamento || null,
      activo: form.activo,
    };

    setSaving(true);
    try {
      if (isEditing && form.id) {
        await actualizarFeriado(form.id, payload);
        toast.success('Feriado actualizado correctamente.');
      } else {
        await crearFeriado({
          fecha: form.fecha,
          descripcion: form.descripcion,
          ambito: form.ambito,
          codigo_departamento: form.codigo_departamento || null,
          activo: form.activo,
        });
        toast.success('Feriado creado correctamente.');
      }
      resetForm();
      await fetchFeriados(filter);
      setShowApplicableResults(false);
    } catch {
      toast.error('Error al guardar el feriado.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (item) => {
    const updated = { activo: !item.activo };
    setActionLoadingId(item.id);
    try {
      await actualizarFeriado(item.id, updated);
      setFeriados((current) =>
        current.map((feriado) =>
          feriado.id === item.id ? { ...feriado, activo: !feriado.activo } : feriado
        )
      );
      toast.success(`Feriado ${item.activo ? 'desactivado' : 'activado'} correctamente.`);
    } catch {
      toast.error('No se pudo actualizar el estado.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePermanent = async () => {
    if (!deleteTarget) return;
    setActionLoadingId(deleteTarget.id);
    try {
      await eliminarFeriadoPermanente(deleteTarget.id);
      setFeriados((current) => current.filter((item) => item.id !== deleteTarget.id));
      toast.success('Feriado eliminado permanentemente.');
      setDeleteTarget(null);
    } catch {
      toast.error('No se pudo eliminar el feriado.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <Header title="Feriados" subtitle="Calendario y administración de feriados nacionales y departamentales" />

      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Resumen de feriados</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Feriados cargados y filtros activos.
                  </p>
                </div>
                <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {loading ? 'Actualizando...' : 'Datos actualizados'}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Total</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{resumen.total}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Activos</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{resumen.activos}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Nacionales</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{resumen.nacionales}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Departamentales</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{resumen.departamentales}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <form
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                onSubmit={handleSubmitFilter}
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-900">Filtros de calendario</h2>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="anio">
                      Año
                    </label>
                    <input
                      id="anio"
                      type="number"
                      placeholder="2025"
                      value={filter.anio}
                      onChange={(event) => handleFilterChange('anio', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#D9A404] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="ambito">
                      Ámbito
                    </label>
                    <select
                      id="ambito"
                      value={filter.ambito}
                      onChange={(event) => handleFilterChange('ambito', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#D9A404] focus:outline-none"
                    >
                      {AMBITOS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="codigo_departamento">
                      Departamento
                    </label>
                    <select
                      id="codigo_departamento"
                      value={filter.codigo_departamento}
                      onChange={(event) => handleFilterChange('codigo_departamento', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#D9A404] focus:outline-none"
                    >
                      {DEPARTAMENTOS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="activo">
                      Estado
                    </label>
                    <select
                      id="activo"
                      value={filter.activo}
                      onChange={(event) => handleFilterChange('activo', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#D9A404] focus:outline-none"
                    >
                      <option value="">Todos</option>
                      <option value="true">Activos</option>
                      <option value="false">Inactivos</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#D9A404] px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-yellow-400"
                >
                  Filtrar resultados
                </button>
              </form>

              <form
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                onSubmit={handleSearchAplicables}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-900">Feriados aplicables</h2>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  Busca feriados que aplican a una fecha recurrente en un departamento.
                </p>

                <div className="mt-6 grid gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="dia">
                      Día
                    </label>
                    <input
                      id="dia"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="1"
                      value={applicableSearch.dia}
                      onChange={(event) => handleApplicableChange('dia', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#D9A404] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="mes">
                      Mes
                    </label>
                    <input
                      id="mes"
                      type="number"
                      min="1"
                      max="12"
                      placeholder="1"
                      value={applicableSearch.mes}
                      onChange={(event) => handleApplicableChange('mes', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#D9A404] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="codigo_departamento_aplicable">
                      Departamento
                    </label>
                    <select
                      id="codigo_departamento_aplicable"
                      value={applicableSearch.codigo_departamento}
                      onChange={(event) => handleApplicableChange('codigo_departamento', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#D9A404] focus:outline-none"
                    >
                      <option value="">Selecciona departamento</option>
                      {DEPARTAMENTOS.slice(1).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#D9A404] px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-yellow-400"
                >
                  Buscar aplicables
                </button>
              </form>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Plus className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-lg font-semibold text-slate-900">Registrar feriado</p>
                  <p className="text-sm text-slate-500">
                    Crea o actualiza feriados nacionales y departamentales.
                  </p>
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmitForm}>
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="fecha">
                    Fecha
                  </label>
                  <input
                    id="fecha"
                    type="date"
                    value={form.fecha}
                    onChange={(event) => setForm((current) => ({ ...current, fecha: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#D9A404] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="descripcion">
                    Descripción
                  </label>
                  <input
                    id="descripcion"
                    type="text"
                    placeholder="Ej: Día de la Independencia"
                    value={form.descripcion}
                    onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#D9A404] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="ambito">
                    Ámbito
                  </label>
                  <select
                    id="ambito"
                    value={form.ambito}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        ambito: event.target.value,
                        codigo_departamento:
                          event.target.value === 'NACIONAL' ? '' : current.codigo_departamento,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#D9A404] focus:outline-none"
                  >
                    <option value="NACIONAL">Nacional</option>
                    <option value="DEPARTAMENTAL">Departamental</option>
                  </select>
                </div>

                {form.ambito === 'DEPARTAMENTAL' && (
                  <div>
                    <label className="text-sm font-medium text-slate-700" htmlFor="codigo_departamento_form">
                      Departamento
                    </label>
                    <select
                      id="codigo_departamento_form"
                      value={form.codigo_departamento}
                      onChange={(event) => setForm((current) => ({ ...current, codigo_departamento: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-[#D9A404] focus:outline-none"
                    >
                      <option value="">Selecciona departamento</option>
                      {DEPARTAMENTOS.slice(1).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <input
                    id="activo"
                    type="checkbox"
                    checked={form.activo}
                    onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-[#D9A404] focus:ring-[#D9A404]"
                  />
                  <label className="text-sm font-medium text-slate-700" htmlFor="activo">
                    Activo
                  </label>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-2xl bg-[#D9A404] px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : isEditing ? (
                      'Actualizar feriado'
                    ) : (
                      'Crear feriado'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Limpiar
                  </button>
                </div>
              </form>
            </div>

            {showApplicableResults && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Feriados aplicables</p>
                    <p className="text-sm text-slate-500">
                      Resultados para la fecha seleccionada.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {applicableResults.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay feriados aplicables para estos filtros.</p>
                  ) : (
                    applicableResults.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.descripcion}</p>
                            <p className="text-sm text-slate-500">
                              {formatFecha(item.fecha)} · {item.ambito}
                              {item.codigo_departamento ? ` · ${item.codigo_departamento}` : ''}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                              item.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </aside>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-900">Lista de feriados</p>
              <p className="text-sm text-slate-500">
                Filtra y administra feriados desde el calendario central.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <CalendarDays className="h-4 w-4" />
              {resumen.total} registros
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Ámbito</th>
                  <th className="px-4 py-3">Departamento</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando feriados...
                      </div>
                    </td>
                  </tr>
                ) : feriados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      No hay feriados registrados.
                    </td>
                  </tr>
                ) : (
                  feriados.map((item) => (
                    <tr key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50">
                      <td className="px-4 py-4 align-top text-slate-700">{formatFecha(item.fecha)}</td>
                      <td className="px-4 py-4 align-top text-slate-700">{item.descripcion}</td>
                      <td className="px-4 py-4 align-top text-slate-700">{item.ambito}</td>
                      <td className="px-4 py-4 align-top text-slate-700">
                        {item.codigo_departamento || '—'}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                            item.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActivo(item)}
                            disabled={actionLoadingId === item.id}
                            className="inline-flex items-center gap-2 rounded-2xl bg-yellow-100 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-yellow-200 disabled:opacity-70"
                          >
                            {actionLoadingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            {item.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-10">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900">Eliminar feriado</h3>
            <p className="mt-3 text-sm text-slate-600">
              Esta acción eliminará el feriado permanentemente. Si solo deseas desactivarlo, usa el botón "Desactivar".
            </p>
            <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{deleteTarget.descripcion}</p>
              <p className="text-sm text-slate-600">
                {formatFecha(deleteTarget.fecha)} · {deleteTarget.ambito}{' '}
                {deleteTarget.codigo_departamento ? `· ${deleteTarget.codigo_departamento}` : ''}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePermanent}
                disabled={actionLoadingId === deleteTarget.id}
                className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
              >
                {actionLoadingId === deleteTarget.id ? 'Eliminando...' : 'Eliminar permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feriados;
