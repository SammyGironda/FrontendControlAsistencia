import client from './client';

const API_PREFIX = '/api/v1';

// Cliente de /api/v1/compensaciones-horas-extra.
//
// Registra que un empleado trabajo un fin de semana o feriado no planeado. El
// backend solo inserta la fila; el trigger trg_compensacion_horas_extra_a_vacacion
// es el que suma esas horas a vacacion.horas_correspondientes Y a
// vacacion.horas_goce_haber.
//
// OJO 1: la barra final es OBLIGATORIA en ambas rutas. Los dos endpoints se
// declaran como "/" en el router; sin ella FastAPI responde con un redirect 307.
//
// OJO 2: `horas` es Decimal(4,1) en el backend, asi que en el JSON viaja como
// STRING ("8.0"), no como number. Hay que castear con Number() antes de sumar,
// o se concatena texto. Ver aNumero/formatearHoras en lib/formatters.js.
//
// OJO 3: la respuesta NO trae ningun dato del empleado (ni nombre ni CI), solo
// id_empleado e id_registrado_por. Ambos son FK a empleado.id — id_registrado_por
// NO apunta a usuario.id — asi que hay que cruzarlos contra el padron.
//
// OJO 4: no existe PUT ni DELETE. Una compensacion registrada no se puede
// editar ni anular desde la API, y el trigger solo actua en INSERT.

// ---------------------------------------------------------------------------
// Lectura (admin + rrhh)
// ---------------------------------------------------------------------------

// Listado con filtros opcionales: { id_empleado, gestion, skip, limit }
// El backend ya devuelve ordenado por fecha DESC.
// El tope de `limit` es 500 (le=500 en el router), no 1000.
export const getCompensaciones = async (params = {}) => {
  try {
    const { id_empleado, gestion, skip, limit } = params;

    const queryParams = {
      skip: typeof skip === 'number' ? skip : 0,
      limit: Number(limit) || 100,
    };

    if (id_empleado) {
      queryParams.id_empleado = Number(id_empleado);
    }

    if (gestion) {
      queryParams.gestion = Number(gestion);
    }

    const response = await client.get(`${API_PREFIX}/compensaciones-horas-extra/`, {
      params: queryParams,
    });
    return response.data;
  } catch (error) {
    console.error('getCompensaciones error', error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Escritura (solo admin)
// ---------------------------------------------------------------------------

// data: {
//   id_empleado: number,
//   fecha: 'YYYY-MM-DD',   // el dia trabajado que se compensa
//   horas: number > 0,     // 8 por defecto del lado del backend
//   motivo: string,        // obligatorio, min_length=1
//   gestion?: 2020..2100,  // si se omite, el backend usa el anio de `fecha`
// }
//
// NO enviar id_registrado_por: el backend lo deriva del JWT con
// get_actor_empleado_id() y Pydantic lo ignora si el cliente lo manda.
//
// Sin try/catch a proposito: el error tiene que llegar entero al onError de la
// mutation, que distingue el 409 (fecha ya registrada) del resto.
export const crearCompensacion = async (data) => {
  const response = await client.post(`${API_PREFIX}/compensaciones-horas-extra/`, data);
  return response.data;
};
