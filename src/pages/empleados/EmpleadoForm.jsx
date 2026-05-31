import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEmpleado, useCrearEmpleado, useActualizarEmpleado } from '../../hooks/useEmpleados';
import { getCargos, getDepartamentos } from '../../api/empleados';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Info, X, ChevronDown, HelpCircle } from 'lucide-react';
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

const EmpleadoForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);

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
    }
  });

  useEffect(() => {
    if (empleado) {
      reset({
        ...empleado,
        fecha_nacimiento: format(new Date(empleado.fecha_nacimiento), 'yyyy-MM-dd'),
        fecha_ingreso: format(new Date(empleado.fecha_ingreso), 'yyyy-MM-dd'),
        id_cargo: String(empleado.id_cargo),
        id_departamento: String(empleado.id_departamento),
        ci_sufijo_homonimo: empleado.ci_sufijo_homonimo || '',
        salario_base: empleado.salario_base ? String(empleado.salario_base) : '',
        email: empleado.email || '',
        telefono: empleado.telefono || '',
      });
    }
  }, [empleado, reset]);

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

  if (!isNew && isLoadingEmpleado) return <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">Cargando...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[95vh] flex flex-col animate-slide-up">
        <header className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg z-10">
          <h2 className="text-lg font-semibold text-gray-800">{isNew ? 'Nuevo Empleado' : 'Editar Empleado'}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
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
                <InputField label="Nombres" name="nombres" register={register} errors={errors} required placeholder="Ej: Ana María" />
                <InputField label="Apellidos" name="apellidos" register={register} errors={errors} required placeholder="Ej: Condori Mamani" />
                <InputField label="Número de CI" name="ci_numero" register={register} errors={errors} required placeholder="Ej: 7823456" info="El CI se valida según estándar SEGIP" />
                <SelectField label="Extensión CI" name="complemento_dep" control={control} errors={errors} options={CI_EXTENSIONS.map(ext => ({ value: ext, label: ext }))} required />
                <InputField label="Sufijo homónimo" name="ci_sufijo_homonimo" register={register} errors={errors} placeholder="Ej: 1A" tooltip="Opcional. Solo si el SEGIP emitió sufijo por homonimia." />
                <InputField label="Fecha de Nacimiento" name="fecha_nacimiento" type="date" register={register} errors={errors} required />
                <SelectField label="Género" name="genero" control={control} errors={errors} options={[{value: 'masculino', label: 'Masculino'}, {value: 'femenino', label: 'Femenino'}, {value: 'otro', label: 'Otro'}]} required />
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
                <SelectField label="Cargo / Puesto" name="id_cargo" control={control} errors={errors} options={cargos?.map(c => ({ value: c.id, label: c.nombre })) || []} required />
                <SelectField label="Área / Departamento" name="id_departamento" control={control} errors={errors} options={departamentos?.map(d => ({ value: d.id, label: d.nombre })) || []} required />
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
          
          <footer className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 p-4 bg-gray-50 border-t border-gray-200 sticky bottom-0 rounded-b-lg">
            <button type="button" onClick={handleClose} className="w-full sm:w-auto mt-2 sm:mt-0 px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || isCreating || isUpdating} className="w-full sm:w-auto px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
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
