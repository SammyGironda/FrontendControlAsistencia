import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEmpleado, useCrearEmpleado, useActualizarEmpleado } from '../../hooks/useEmpleados';
// import { useCargos, useDepartamentos, useHorarios } from '../../hooks/useConfig'; // Hooks centralizados
import { toast } from 'react-hot-toast';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { Info, X, ChevronDown, HelpCircle } from 'lucide-react';
import { Tooltip } from 'react-tooltip';

const empleadoSchema = z.object({
  nombres: z.string().min(2, 'El nombre es muy corto').max(50, 'El nombre es muy largo'),
  apellido_paterno: z.string().min(2, 'El apellido es muy corto').max(50, 'El apellido es muy largo'),
  apellido_materno: z.string().max(50, 'El apellido es muy largo').optional(),
  fecha_nacimiento: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Fecha inválida' }),
  genero: z.string().min(1, 'Género es requerido'),
  ci: z.string().min(5, 'CI debe tener al menos 5 dígitos').regex(/^[0-9]+$/, "CI debe ser numérico"),
  ci_extension: z.string().min(1, 'Extensión de CI es requerida'),
  ci_complemento: z.string().optional(),
  fecha_ingreso: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Fecha inválida' }),
  cargo_id: z.string().min(1, 'Cargo es requerido'),
  departamento_id: z.string().min(1, 'Departamento es requerido'),
  horario_id: z.string().min(1, 'Turno es requerido'),
  salario_base: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive('El salario debe ser un número positivo')
  ),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
});

const CI_EXTENSIONS = ['LP', 'CB', 'SC', 'OR', 'PT', 'TJ', 'CH', 'BE', 'PA'];

const EmpleadoForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const { data: empleado, isLoading: isLoadingEmpleado } = useEmpleado(id);
  const { mutate: crearEmpleado, isLoading: isCreating } = useCrearEmpleado();
  const { mutate: actualizarEmpleado, isLoading: isUpdating } = useActualizarEmpleado();

  // Mock data for dropdowns - replace with react-query hooks
  const { data: cargos } = { data: [{ id: 1, nombre: 'Administradora RRHH' }, { id: 2, nombre: 'Contador Senior' }] };
  const { data: departamentos } = { data: [{ id: 1, nombre: 'Administración' }, { id: 2, nombre: 'Finanzas' }] };
  const { data: horarios } = { data: [{ id: 1, nombre: 'Turno Mañana' }, { id: 2, nombre: 'Turno Tarde' }] };

  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(empleadoSchema),
    defaultValues: {
        nombres: '',
        apellido_paterno: '',
        apellido_materno: '',
        fecha_nacimiento: '',
        genero: '',
        ci: '',
        ci_extension: '',
        ci_complemento: '',
        fecha_ingreso: '',
        cargo_id: '',
        departamento_id: '',
        horario_id: '',
        salario_base: '0',
        email: '',
        telefono: '',
    }
  });

  useEffect(() => {
    if (empleado) {
      reset({
        ...empleado,
        fecha_nacimiento: format(new Date(empleado.fecha_nacimiento), 'yyyy-MM-dd'),
        fecha_ingreso: format(new Date(empleado.fecha_ingreso), 'yyyy-MM-dd'),
        cargo_id: String(empleado.cargo_id),
        departamento_id: String(empleado.departamento_id),
        horario_id: String(empleado.horario_id),
        salario_base: String(empleado.salario_base),
      });
    }
  }, [empleado, reset]);

  const onSubmit = (data) => {
    const payload = {
        ...data,
        cargo_id: parseInt(data.cargo_id),
        departamento_id: parseInt(data.departamento_id),
        horario_id: parseInt(data.horario_id),
        salario_base: parseFloat(data.salario_base),
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

  if (!isNew && isLoadingEmpleado) return <div className="fixed inset-0 bg-white/80 flex items-center justify-center">Cargando...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up">
        <header className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">{isNew ? 'Nuevo Empleado' : 'Editar Empleado'}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Datos de Identidad */}
            <section>
              <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide border-l-4 border-blue-700 pl-3 mb-6">
                Datos de Identidad
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <InputField label="Nombres" name="nombres" register={register} errors={errors} required placeholder="Ej: Ana María" />
                <InputField label="Apellido Paterno" name="apellido_paterno" register={register} errors={errors} required placeholder="Ej: Condori" />
                <InputField label="Apellido Materno" name="apellido_materno" register={register} errors={errors} placeholder="Ej: Mamani" />
                <InputField label="Número de CI" name="ci" register={register} errors={errors} required placeholder="Ej: 7823456" info="El CI se valida según estándar SEGIP" />
                <SelectField label="Extensión CI" name="ci_extension" control={control} errors={errors} options={CI_EXTENSIONS.map(ext => ({ value: ext, label: ext }))} required />
                <InputField label="Complemento CI" name="ci_complemento" register={register} errors={errors} placeholder="Ej: 1A" tooltip="Opcional. Solo si el SEGIP emitió complemento por homonimia." />
                <InputField label="Fecha de Nacimiento" name="fecha_nacimiento" type="date" register={register} errors={errors} required />
                <SelectField label="Género" name="genero" control={control} errors={errors} options={[{value: 'MASCULINO', label: 'Masculino'}, {value: 'FEMENINO', label: 'Femenino'}, {value: 'OTRO', label: 'Otro'}]} required />
              </div>
            </section>

            {/* Datos Laborales */}
            <section>
              <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide border-l-4 border-blue-700 pl-3 mb-6">
                Datos Laborales
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <InputField label="Fecha de Ingreso" name="fecha_ingreso" type="date" register={register} errors={errors} required />
                <InputField label="Salario Base (Bs.)" name="salario_base" type="text" inputMode="decimal" register={register} errors={errors} required placeholder="Ej: 3500.50" />
                <SelectField label="Cargo / Puesto" name="cargo_id" control={control} errors={errors} options={cargos?.map(c => ({ value: c.id, label: c.nombre })) || []} required />
                <SelectField label="Área / Departamento" name="departamento_id" control={control} errors={errors} options={departamentos?.map(d => ({ value: d.id, label: d.nombre })) || []} required />
                <SelectField label="Turno Asignado" name="horario_id" control={control} errors={errors} options={horarios?.map(h => ({ value: h.id, label: h.nombre })) || []} required />
              </div>
            </section>
             {/* Datos de Contacto */}
             <section>
              <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide border-l-4 border-blue-700 pl-3 mb-6">
                Datos de Contacto
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <InputField label="Email" name="email" type="email" register={register} errors={errors} placeholder="ejemplo@dominio.com" />
                <InputField label="Teléfono" name="telefono" register={register} errors={errors} placeholder="Ej: 76543210" />
              </div>
            </section>
          </div>
          
          <footer className="flex justify-end space-x-4 p-4 bg-gray-50 border-t border-gray-200 sticky bottom-0">
            <button type="button" onClick={handleClose} className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || isCreating || isUpdating} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              {isSubmitting ? 'Registrando...' : (isNew ? 'Registrar Empleado' : 'Guardar Cambios')}
            </button>
          </footer>
        </form>
      </div>
      <Tooltip id="form-tooltip" />
    </div>
  );
};

const InputField = ({ label, name, type = 'text', register, errors, required, placeholder, info, tooltip, ...props }) => (
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
        className={`block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500 ${errors[name] ? 'border-red-500' : ''}`}
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
    {info && !errors[name] && <p className="mt-1 text-xs text-gray-500">{info}</p>}
    {errors[name] && <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>}
  </div>
);

const SelectField = ({ label, name, control, errors, options, required }) => (
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
              className={`appearance-none block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md ${errors[name] ? 'border-red-500' : ''}`}
            >
              <option value="" disabled>Seleccionar {label.toLowerCase()}...</option>
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
      {errors[name] && <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>}
    </div>
  );

export default EmpleadoForm;
