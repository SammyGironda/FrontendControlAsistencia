import client from './client';

const API_PREFIX = '/api/v1';

// Cliente de /api/v1/usuarios. Todos estos endpoints exigen JWT: leer el padron
// es admin+rrhh, y crear/editar/eliminar/resetear es solo admin. El token lo
// adjunta el interceptor de client.js; aca no hay que hacer nada.

export const getUsuarios = async (params = {}) => {
  const { skip = 0, limit = 200, solo_activos, id_rol } = params;

  const queryParams = { skip, limit };
  if (solo_activos) queryParams.solo_activos = true;
  if (id_rol) queryParams.id_rol = id_rol;

  const response = await client.get(`${API_PREFIX}/usuarios/`, { params: queryParams });
  return response.data;
};

export const getUsuario = async (id) => {
  const response = await client.get(`${API_PREFIX}/usuarios/${id}`);
  return response.data;
};

// Alta de cuenta. El body es SOLO { id_empleado, id_rol, activo }: el username y
// la contrasena los genera el backend.
//
// OJO: la respuesta trae `password_temporal` en texto plano y es el UNICO lugar
// donde aparece. No se guarda legible en ningun lado, asi que si se pierde hay
// que llamar a resetearPassword().
export const crearUsuario = async ({ id_empleado, id_rol, activo = true }) => {
  const response = await client.post(`${API_PREFIX}/usuarios/`, {
    id_empleado,
    id_rol,
    activo,
  });
  return response.data;
};

export const actualizarUsuario = async (id, data) => {
  const response = await client.put(`${API_PREFIX}/usuarios/${id}`, data);
  return response.data;
};

export const eliminarUsuario = async (id) => {
  const response = await client.delete(`${API_PREFIX}/usuarios/${id}`);
  return response.data;
};

export const toggleActivoUsuario = async (id) => {
  const response = await client.patch(`${API_PREFIX}/usuarios/${id}/toggle-activo`);
  return response.data;
};

// Genera una contrasena temporal nueva. Es la unica recuperacion del sistema:
// no hay envio por correo. Misma advertencia que crearUsuario sobre la
// respuesta.
export const resetearPassword = async (id) => {
  const response = await client.post(`${API_PREFIX}/usuarios/${id}/resetear-password`);
  return response.data;
};
