import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEmpleado, useCrearEmpleado, useActualizarEmpleado } from '../../hooks/useEmpleados';
import { getCargos, getDepartamentos } from '../../api/empleados';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { X, ChevronDown, HelpCircle, AlertCircle } from 'lucide-react';
import { Tooltip } from 'react-tooltip';

const empleadoSchema = z.object({
  nombres: z.string().min(2, 'El nombre es muy corto').max(50, 'El nombre es muy largo'),
  apellidos: z.string().min(2, 'Los apellidos son muy cortos').max(100, 'Los apellidos son muy largos'),
  fecha_nacimiento: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Fecha inválida' }),
  genero: z.string().min(1, 'Género es requerido'),
  ci_numero: z.string().min(4, 'CI debe tener al menos 4 dígitos').regex(/^[0-9]+$/, 'CI debe ser numérico'),
  complemento_dep: z.string().length(2, 'La extensión debe tener 2 caracteres'),
  ci_sufijo_homonimo: z.string().max(10, 'El sufijo es muy largo').optional().or(z.literal('')),
  fecha_ingreso: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Fecha inválida' }),
  id_cargo: z.string().min(1, 'Cargo es requerido'),
  id_departamento: z.string().min(1, 'Departamento es requerido'),
  salario_base: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
});

const CI_EXTENSIONS = ['LP', 'CB', 'SC', 'OR', 'PT', 'TJ', 'CH', 'BE', 'PA'];

const FIELD_LABELS = {
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  fecha_nacimiento: 'Fecha de Nacimiento',
  genero: 'Género',
  ci_numero: 'Número de CI',
  complemento_dep: 'Extensión CI',
  ci_sufijo_homonimo: 'Sufijo homónimo',
  fecha_ingreso: 'Fecha de Ingreso',
  id_cargo: 'Cargo / Puesto',
  id_departamento: 'Área / Departamento',
  salario_base: 'Salario Base',
  email: 'Email',
  telefono: 'Teléfono',
};

const getOptionLabel = (options, value) => {
  const option = options?.find((opt) => String(opt.value) === String(value));
  return option ? option.label : value;
};

const getInitials = (name = '') => {
  if (!name) return '';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('');
};

const getEstadoBadge = (estado) => {
  const status = String(estado || '').toLowerCase();
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold';

  if (status.includes('activo') || status.includes('habilitado')) {
    return `${base} bg-emerald-100 text-emerald-800`;
  }
  if (status.includes('suspendido') || status.includes('inactivo') || status.includes('baja')) {
    return `${base} bg-rose-100 text-rose-800`;
  }
  return `${base} bg-slate-100 text-slate-700`;
};

const EmpleadoForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const originalValues = useRef({});

  const { data: empleado, isLoading: isLoadingEmpleado } = useEmpleado(id);
  const { mutate: crearEmpleado, isLoading: isCreating } = useCrearEmpleado();
  const { mutate: actualizarEmpleado, isLoading: isUpdating } = useActualizarEmpleado();

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      try {
        const [cargosData, departamentosData] = await Promise.all([
          getCargos(),
          getDepartamentos(),
        ]);

        if (mounted) {
          setCargos(cargosData);
          setDepartamentos(departamentosData);
        }
      } catch {
        toast.error('No se pudieron cargar los catálogos de cargos y departamentos.');
      }
    };

    loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(empleadoSchema),
    defaultValues: {
      nombres: '',
      apellidos: '',
      fecha_nacimiento: '',
      genero: '',
      ci_numero: '',
      complemento_dep: '',
      ci_sufijo_homonimo: '',
      fecha_ingreso: '',
      id_cargo: '',
      id_departamento: '',
      salario_base: '0',
      email: '',
      telefono: '',
    },
  });

  useEffect(() => {
    if (empleado) {
      const resetValues = {
        ...empleado,
        fecha_nacimiento: format(new Date(empleado.fecha_nacimiento), 'yyyy-MM-dd'),
        fecha_ingreso: format(new Date(empleado.fecha_ingreso), 'yyyy-MM-dd'),
        id_cargo: String(empleado.id_cargo),
        id_departamento: String(empleado.id_departamento),
        ci_sufijo_homonimo: empleado.ci_sufijo_homonimo || '',
        salario_base: empleado.salario_base ? String(empleado.salario_base) : '',
        email: empleado.email || '',
        telefono: empleado.telefono || '',
      };

      originalValues.current = { ...resetValues };
      reset(resetValues);
    }
  }, [empleado, reset]);

  const currentValues = watch();

  const modifiedFields = useMemo(() => {
    if (isNew) return [];
    return Object.entries(currentValues || {})
      .filter(([field, value]) => {
        const original = originalValues.current[field];
        return original !== undefined && String(original) !== String(value);
      })
      .map(([field]) => field);
  }, [currentValues, isNew]);

  const modifiedLabels = modifiedFields.map((field) => FIELD_LABELS[field] || field);
  const hasChanges = modifiedFields.length > 0;

  const cargoLabel = getOptionLabel(cargos?.map((c) => ({ value: c.id, label: c.nombre })) || [], empleado?.id_cargo);

  const onSubmit = (data) => {
    const payload = {
      ...data,
      id_cargo: parseInt(data.id_cargo, 10),
      id_departamento: parseInt(data.id_departamento, 10),
      ci_sufijo_homonimo: data.ci_sufijo_homonimo || null,
      salario_base: data.salario_base ? parseFloat(data.salario_base) : null,
      email: data.email || null,
      telefono: data.telefono || null,
    };

    const action = isNew ? crearEmpleado : (d) => actualizarEmpleado({ id, data: d });

    action(payload, {
      onSuccess: () => {
        toast.success(`Empleado ${isNew ? 'registrado' : 'actualizado'} con éxito.`);
        navigate('/empleados');
      },
      onError: (error) => {
        const errorMsg = error.response?.data?.detail || 'Ocurrió un error inesperado.';
        toast.error(errorMsg);
      },
    });
  };

  const handleClose = () => navigate('/empleados');

  if (!isNew && isLoadingEmpleado) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-2 sm:p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="p-4 sm:p-6 flex-grow overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-12 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[95vh] flex flex-col animate-slide-up">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg z-10 gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-800">{isNew ? 'Nuevo Empleado' : 'Editar Empleado'}</h2>
            {!isNew && empleado && (
              <div className="mt-4 bg-slate-50 border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white font-semibold text-sm">
                    {getInitials(`${empleado.nombres} ${empleado.apellidos}`)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{`${empleado.nombres} ${empleado.apellidos}`}</p>
                    <p className="text-xs text-slate-500">
                      {empleado.ci_numero}{empleado.complemento_dep ? `-${empleado.complemento_dep}` : ''}{empleado.ci_sufijo_homonimo ? `-${empleado.ci_sufijo_homonimo}` : ''}
                      {' '}|{' '}
                      {cargoLabel}
                      {' '}|{' '}
                      <span className={getEstadoBadge(empleado.estado)}>{empleado.estado || 'Sin estado'}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 self-start sm:self-auto">
            <X size={24} />
          </button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-8">
            {/* Datos de Identidad */}
            <section>
              <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide border-l-4 border-blue-700 pl-3 mb-6">
                Datos de Identidad
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <InputField label="Nombres" name="nombres" register={register} errors={errors} required placeholder="Ej: Ana María" originalValue={originalValues.current.nombres} currentValue={currentValues.nombres} />
                <InputField label="Apellidos" name="apellidos" register={register} errors={errors} required placeholder="Ej: Condori Mamani" originalValue={originalValues.current.apellidos} currentValue={currentValues.apellidos} />
                <InputField label="Número de CI" name="ci_numero" register={register} errors={errors} required placeholder="Ej: 7823456" info="El CI se valida según estándar SEGIP" originalValue={originalValues.current.ci_numero} currentValue={currentValues.ci_numero} />
                <SelectField label="Extensión CI" name="complemento_dep" control={control} errors={errors} options={CI_EXTENSIONS.map((ext) => ({ value: ext, label: ext }))} required originalValue={originalValues.current.complemento_dep} currentValue={currentValues.complemento_dep} />
                <InputField label="Sufijo homónimo" name="ci_sufijo_homonimo" register={register} errors={errors} placeholder="Ej: 1A" tooltip="Opcional. Solo si el SEGIP emitió sufijo por homonimia." originalValue={originalValues.current.ci_sufijo_homonimo} currentValue={currentValues.ci_sufijo_homonimo} />
                <InputField label="Fecha de Nacimiento" name="fecha_nacimiento" type="date" register={register} errors={errors} required originalValue={originalValues.current.fecha_nacimiento} currentValue={currentValues.fecha_nacimiento} />
                <SelectField label="Género" name="genero" control={control} errors={errors} options={[{ value: 'masculino', label: 'Masculino' }, { value: 'femenino', label: 'Femenino' }, { value: 'otro', label: 'Otro' }]} required originalValue={originalValues.current.genero} currentValue={currentValues.genero} />
              </div>
            </section>

            {/* Datos Laborales */}
            <section>
              <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide border-l-4 border-blue-700 pl-3 mb-6">
                Datos Laborales
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <InputField label="Fecha de Ingreso" name="fecha_ingreso" type="date" register={register} errors={errors} required originalValue={originalValues.current.fecha_ingreso} currentValue={currentValues.fecha_ingreso} />
                <InputField label="Salario Base (Bs.)" name="salario_base" type="text" inputMode="decimal" register={register} errors={errors} required placeholder="Ej: 3500.50" originalValue={originalValues.current.salario_base} currentValue={currentValues.salario_base} />
                <SelectField label="Cargo / Puesto" name="id_cargo" control={control} errors={errors} options={cargos?.map((c) => ({ value: c.id, label: c.nombre })) || []} required originalValue={originalValues.current.id_cargo} currentValue={currentValues.id_cargo} originalLabel={getOptionLabel(cargos?.map((c) => ({ value: c.id, label: c.nombre })) || [], originalValues.current.id_cargo)} />
                <SelectField label="Área / Departamento" name="id_departamento" control={control} errors={errors} options={departamentos?.map((d) => ({ value: d.id, label: d.nombre })) || []} required originalValue={originalValues.current.id_departamento} currentValue={currentValues.id_departamento} originalLabel={getOptionLabel(departamentos?.map((d) => ({ value: d.id, label: d.nombre })) || [], originalValues.current.id_departamento)} />
              </div>
            </section>
             {/* Datos de Contacto */}
             <section>
              <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide border-l-4 border-blue-700 pl-3 mb-6">
                Datos de Contacto
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <InputField label="Email" name="email" type="email" register={register} errors={errors} placeholder="ejemplo@dominio.com" originalValue={originalValues.current.email} currentValue={currentValues.email} />
                <InputField label="Teléfono" name="telefono" register={register} errors={errors} placeholder="Ej: 76543210" originalValue={originalValues.current.telefono} currentValue={currentValues.telefono} />
              </div>
            </section>
          </div>

          {!isNew && hasChanges && (
            <div className="sticky bottom-20 z-20 bg-[#FFFBEB] border-t border-[#FDE68A] px-5 py-3 flex flex-col sm:flex-row items-center gap-3 text-sm text-[#92400E] font-medium">
              <div className="flex items-center gap-2 text-[#92400E]">
                <AlertCircle size={16} className="text-[#D97706]" />
                <span>Tienes {modifiedFields.length} campo(s) modificado(s) sin guardar</span>
              </div>
              <div className="text-xs text-gray-500">
                {modifiedLabels.join(', ')}
              </div>
            </div>
          )}
          
          <footer className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 p-4 bg-gray-50 border-t border-gray-200 sticky bottom-0 rounded-b-lg">
            <button type="button" onClick={handleClose} className="w-full sm:w-auto mt-2 sm:mt-0 px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCreating || isUpdating || (!isNew && !hasChanges)}
              data-tooltip-id={!isNew && !hasChanges ? 'submit-tooltip' : undefined}
              data-tooltip-content={!isNew && !hasChanges ? 'No hay cambios que guardar' : undefined}
              className={`w-full sm:w-auto px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${!isNew ? (hasChanges ? 'bg-primary hover:bg-primary-light' : 'bg-primary opacity-50 cursor-not-allowed') : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSubmitting ? 'Registrando...' : (isNew ? 'Registrar Empleado' : `Guardar ${modifiedFields.length} cambio(s)`)}
            </button>
          </footer>
        </form>
      </div>
      <Tooltip id="form-tooltip" />
      <Tooltip id="submit-tooltip" />
    </div>
  );
};

const InputField = ({ label, name, type = 'text', register, errors, required, placeholder, info, tooltip, originalValue, currentValue, ...props }) => {
  const isModified = originalValue !== undefined && String(originalValue) !== String(currentValue);
  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          type={type}
          placeholder={placeholder}
          {...register(name)}
          className={`block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 ${errors[name] ? 'border-red-500' : ''} ${isModified ? 'border-l-4 border-yellow-400' : ''}`}
          {...props}
        />
        {tooltip && (
          <HelpCircle
            data-tooltip-id="form-tooltip"
            data-tooltip-content={tooltip}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
          />
        )}
      </div>
      {isModified && (
        <p className="mt-1 text-xs text-gray-400 italic">Antes: {originalValue}</p>
      )}
      {info && !errors[name] && <p className="mt-1 text-xs text-gray-500">{info}</p>}
      {errors[name] && <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>}
    </div>
  );
};

const SelectField = ({ label, name, control, errors, options, required, originalValue, currentValue, originalLabel }) => {
  const selectedOriginalLabel = originalLabel || getOptionLabel(options, originalValue);
  const isModified = originalValue !== undefined && String(originalValue) !== String(currentValue);

  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <select
              {...field}
              id={name}
              className={`appearance-none block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md ${errors[name] ? 'border-red-500' : ''} ${isModified ? 'border-l-4 border-yellow-400' : ''}`}
            >
              <option value="" disabled>Seleccionar {label.toLowerCase()}...</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
      {isModified && (
        <p className="mt-1 text-xs text-gray-400 italic">Antes: {selectedOriginalLabel}</p>
      )}
      {errors[name] && <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>}
    </div>
  );
};

export default EmpleadoForm;
