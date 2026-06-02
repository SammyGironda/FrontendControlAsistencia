import client from './client';

const API_PREFIX = '/api/v1';

export const getContratos = async (params = {}) => {
  const {
    skip = 0,
    limit = 25,
    estado,
    tipo_contrato,
    tipo,
    empleado_id,
  } = params;

  const queryParams = {
    skip: Number(skip),
    limit: Number(limit),
  };

  if (estado) queryParams.estado = estado;
  if (tipo_contrato) queryParams.tipo_contrato = tipo_contrato;
  if (tipo) queryParams.tipo_contrato = tipo;
  if (empleado_id) queryParams.empleado_id = Number(empleado_id);

  const response = await client.get(`${API_PREFIX}/contratos/`, {
    params: queryParams,
  });
  return response.data;
};

export const getContrato = async (contratoId) => {
  const response = await client.get(`${API_PREFIX}/contratos/${contratoId}`);
  return response.data;
};

export const getContratosEmpleado = async (empleadoId) => {
  const response = await client.get(`${API_PREFIX}/contratos/empleado/${empleadoId}`);
  return response.data;
};

export const getContratoActivoEmpleado = async (empleadoId) => {
  const response = await client.get(`${API_PREFIX}/contratos/empleado/${empleadoId}/activo`);
  return response.data;
};

export const crearContrato = async (data) => {
  const response = await client.post(`${API_PREFIX}/contratos/`, data);
  return response.data;
};

export const crearContratoIndefinido = async (data) => {
  const response = await client.post(`${API_PREFIX}/contratos/indefinido`, data);
  return response.data;
};

export const crearContratoPlazoFijo = async (data) => {
  const response = await client.post(`${API_PREFIX}/contratos/plazo-fijo`, data);
  return response.data;
};

export const actualizarContrato = async (contratoId, data) => {
  const response = await client.put(`${API_PREFIX}/contratos/${contratoId}`, data);
  return response.data;
};

export const finalizarContrato = async (contratoId, params = {}) => {
  const response = await client.put(
    `${API_PREFIX}/contratos/${contratoId}/finalizar`,
    null,
    { params }
  );
  return response.data;
};

export const rescindirContrato = async (contratoId, params = {}) => {
  const response = await client.put(
    `${API_PREFIX}/contratos/${contratoId}/rescindir`,
    null,
    { params }
  );
  return response.data;
};

export const renovarContrato = async (contratoId, data) => {
  const response = await client.post(`${API_PREFIX}/contratos/${contratoId}/renovar`, data);
  return response.data;
};
