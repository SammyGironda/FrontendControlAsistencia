import client from './client';

const API_PREFIX = '/api/v1';

export const getEmpleados = async (params = {}) => {
  try {
    const { page, skip, limit, estado, id_departamento, id_cargo, area, search } = params;

    const queryParams = {
      skip: typeof skip === 'number' ? skip : Math.max((Number(page) || 1) - 1, 0) * (Number(limit) || 10),
      limit: Number(limit) || 10,
    };

    if (estado) {
      queryParams.estado = estado;
    }

    if (id_departamento) {
      queryParams.id_departamento = Number(id_departamento);
    } else if (area) {
      queryParams.id_departamento = Number(area);
    }

    if (id_cargo) {
      queryParams.id_cargo = Number(id_cargo);
    }

    if (search) {
      // TODO: el backend no expone búsqueda por nombre/CI en este listado.
    }

    const response = await client.get(`${API_PREFIX}/empleados/`, { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('getEmpleados error', error);
    throw error;
  }
};

export const getEmpleado = async (id) => {
  try {
    const response = await client.get(`${API_PREFIX}/empleados/${id}`);
    return response.data;
  } catch (error) {
    console.error('getEmpleado error', error);
    throw error;
  }
};

export const crearEmpleado = async (data) => {
  const response = await client.post(`${API_PREFIX}/empleados/`, data);
  return response.data;
};

export const actualizarEmpleado = async (id, data) => {
  const response = await client.put(`${API_PREFIX}/empleados/${id}`, data);
  return response.data;
};

export const eliminarEmpleado = async (id) => {
  // TODO: DELETE /api/v1/empleados/{id} no existe en el backend.
  // El backend implementa un soft-delete vía PUT /empleados/{id}/dar-baja
  // Si se requiere eliminar desde el frontend, usar darBajaEmpleado(id, { motivo, fecha_efectiva })
  // const response = await client.delete(`${API_PREFIX}/empleados/${id}`);
  // return response.status === 204 ? null : response.data;
  throw new Error('TODO: este endpoint DELETE /empleados/{id} no existe en el backend');
};

export const getCargos = async () => {
  const { data } = await client.get(`${API_PREFIX}/cargos/`);
  return data;
};

export const getDepartamentos = async () => {
  const { data } = await client.get(`${API_PREFIX}/departamentos/`);
  return data;
};

export const getHorarios = async () => {
  const { data } = await client.get(`${API_PREFIX}/horarios/`);
  return data;
};

// Helper: activar o reactivar empleado desde estado por_habilitar o suspendido
export const activarEmpleado = async (id) => {
  const response = await client.put(`${API_PREFIX}/empleados/${id}/reactivar`);
  return response.data;
};

// Helper: rehabilitar empleado desde estado baja a por_habilitar
export const rehabilitarEmpleado = async (id) => {
  const response = await client.put(`${API_PREFIX}/empleados/${id}/habilitar`);
  return response.data;
};

// Helper: suspender empleado desde estado activo
export const suspenderEmpleado = async (id, payload = {}) => {
  const response = await client.put(`${API_PREFIX}/empleados/${id}/suspender`, payload);
  return response.data;
};

// Helper: reactivar empleado desde estado suspendido a activo
export const reactivarEmpleado = async (id) => {
  const response = await client.put(`${API_PREFIX}/empleados/${id}/reactivar`);
  return response.data;
};

// Helper: dar de baja (soft-delete) de empleado usando el endpoint del backend
export const darBajaEmpleado = async (id, payload = {}) => {
  // payload: { motivo?: string, fecha_efectiva?: 'YYYY-MM-DD' }
  const response = await client.put(`${API_PREFIX}/empleados/${id}/dar-baja`, payload);
  return response.data;
};

