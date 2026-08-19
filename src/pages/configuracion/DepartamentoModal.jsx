import { useMemo, useState } from 'react';
import { Info, LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import SelectField from '../../components/common/SelectField';
import { descendientesDe } from '../../lib/arbolDepartamentos';
import {
  mensajeDeError,
  useActualizarDepartamento,
  useCrearDepartamento,
} from '../../hooks/useDepartamentos';

// Espejan los Field(...) de DepartamentoBase en el schema del backend. Se
// duplican aca a proposito, para avisar mientras se escribe en vez de mandar el
// request y traducir un 422. La validacion que manda sigue siendo la del
// backend, que responde 422 si esta copia quedara desactualizada.
const NOMBRE_MIN = 3;
const NOMBRE_MAX = 100;
const CODIGO_MIN = 2;
const CODIGO_MAX = 20;

/**
 * Alta y edicion de un departamento. Un solo modal para los dos casos: el
 * formulario es identico y separarlo duplicaria la exclusion de descendientes,
 * que es la parte delicada.
 *
 * `departamento` null = alta. El padre lo monta solo cuando esta abierto y con
 * una `key` distinta por departamento, asi el estado se reinicia sin un
 * useEffect que llame a setState (que dispara react-hooks/set-state-in-effect).
 */
const DepartamentoModal = ({ departamento = null, departamentos = [], onCerrar, onGuardado }) => {
  const esEdicion = Boolean(departamento);

  const [nombre, setNombre] = useState(departamento?.nombre || '');
  const [codigo, setCodigo] = useState(departamento?.codigo || '');
  // El value de un <select> siempre es string; '' representa "sin padre".
  const [idPadre, setIdPadre] = useState(
    departamento?.id_padre ? String(departamento.id_padre) : ''
  );

  const crearMutation = useCrearDepartamento();
  const actualizarMutation = useActualizarDepartamento();
  const mutacion = esEdicion ? actualizarMutation : crearMutation;

  // Candidatos a padre. Se excluyen tres conjuntos, cada uno por su motivo:
  //
  // 1. El propio departamento y TODOS sus descendientes: colgarlo de su propio
  //    hijo cerraria un ciclo. El backend tambien lo rechaza (400 desde el
  //    2026-08-19), pero un selector que ofrece opciones invalidas y despues
  //    explica el error es peor que uno que no las ofrece.
  // 2. Los inactivos: create_departamento responde 400 "No se puede asignar un
  //    departamento padre inactivo".
  const padresPosibles = useMemo(() => {
    const lista = Array.isArray(departamentos) ? departamentos : [];
    const excluidos = esEdicion ? descendientesDe(lista, departamento.id) : new Set();

    return lista
      .filter((d) => d.activo && !excluidos.has(d.id))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  }, [departamentos, departamento, esEdicion]);

  const nombreLimpio = nombre.trim();
  const codigoLimpio = codigo.trim();

  // Bloqueos duros: solo los que produrian un 422 ilegible. El resto (codigo
  // duplicado, ciclos) lo decide el backend y llega por toast.
  const nombreValido = nombreLimpio.length >= NOMBRE_MIN;
  const codigoValido = codigoLimpio.length >= CODIGO_MIN;
  const puedeEnviar = nombreValido && codigoValido && !mutacion.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;

    // '' -> null: el backend espera NULL para un departamento raiz, no cadena
    // vacia ni NaN.
    const idPadreNumerico = idPadre === '' ? null : Number(idPadre);

    try {
      if (esEdicion) {
        await actualizarMutation.mutateAsync({
          id: departamento.id,
          data: { nombre: nombreLimpio, codigo: codigoLimpio, id_padre: idPadreNumerico },
        });
        toast.success('Departamento actualizado.');
      } else {
        await crearMutation.mutateAsync({
          nombre: nombreLimpio,
          codigo: codigoLimpio,
          id_padre: idPadreNumerico,
        });
        toast.success('Departamento creado.');
      }
      onGuardado();
    } catch (error) {
      toast.error(
        mensajeDeError(
          error,
          esEdicion ? 'No se pudo actualizar el departamento.' : 'No se pudo crear el departamento.'
        ),
        { duration: 6000 }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-7 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">
          {esEdicion ? 'Editar departamento' : 'Nuevo departamento'}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {esEdicion
            ? 'Cambia el nombre, el código o la ubicación dentro del organigrama.'
            : 'Define una unidad organizacional. Puede ser raíz o colgar de otra existente.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-[#718096]">Nombre</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={NOMBRE_MAX}
              autoFocus
              placeholder="Ej. Recursos Humanos"
              className="h-9 w-full rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] text-[#1A202C] outline-none focus:border-[#03178C]"
            />
            {nombre.length > 0 && !nombreValido && (
              <span className="text-[11px] text-[#731B07]">
                El nombre necesita al menos {NOMBRE_MIN} caracteres.
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-[#718096]">Código</span>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              maxLength={CODIGO_MAX}
              placeholder="Ej. RRHH"
              className="h-9 w-full rounded-[8px] border border-[#E2E8F0] px-3 py-2 text-[13px] uppercase text-[#1A202C] outline-none focus:border-[#03178C]"
            />
            {codigo.length > 0 && !codigoValido ? (
              <span className="text-[11px] text-[#731B07]">
                El código necesita al menos {CODIGO_MIN} caracteres.
              </span>
            ) : (
              <span className="text-[11px] text-[#718096]">
                Debe ser único: no puede repetir el de otro departamento.
              </span>
            )}
          </label>

          {/* SelectField recibe las opciones como children y pasa el EVENTO a
              onChange, no el valor. */}
          <SelectField
            label="Departamento padre"
            value={idPadre}
            onChange={(e) => setIdPadre(e.target.value)}
          >
            <option value="">— Ninguno (departamento raíz) —</option>
            {padresPosibles.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.nombre} ({d.codigo})
              </option>
            ))}
          </SelectField>

          {esEdicion && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-[#EBF4FF] p-3">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#03178C]" />
              <p className="text-sm text-slate-600">
                La lista no incluye a <span className="font-semibold">{departamento.nombre}</span>{' '}
                ni a sus subdepartamentos: colgar una unidad de su propia rama rompería
                el organigrama.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!puedeEnviar}
              className="flex items-center gap-2 rounded-lg bg-[#03178C] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutacion.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {esEdicion ? 'Guardar cambios' : 'Crear departamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartamentoModal;
