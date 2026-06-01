import client from './client';

const API_PREFIX = '/api/v1';

export const getRetrasosPorMes = async (mesesAtras = 5) => {
  const response = await client.get(`${API_PREFIX}/dashboard/retrasos-por-mes`, {
    params: { meses_atras: mesesAtras },
  });
  return response.data;
};

export const getHorasTrabajadasMes = async (mes, anio) => {
  const response = await client.get(`${API_PREFIX}/dashboard/horas-trabajadas-mes`, {
    params: { mes, anio },
  });
  return response.data;
};

export const getCumpleanosProximos = async (diasAdelante = 30) => {
  const response = await client.get(`${API_PREFIX}/dashboard/cumpleanos-proximos`, {
    params: { dias_adelante: diasAdelante },
  });
  return response.data;
};
