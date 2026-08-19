import client from './client';

const API_PREFIX = '/api/v1';

// Cliente de /api/v1/departamentos — la estructura organizacional jerarquica de
// la empresa (tabla rrhh.departamento, autorreferencial via id_padre).
//
// NO confundir con:
//   - complemento_dep: el catalogo SEGIP de los 9 departamentos de Bolivia, que
//     es de donde salen los feriados departamentales de un empleado.
//   - rol: los permisos del sistema (admin, rrhh, supervisor...).
//   - cargo: el puesto de trabajo.
//
// Desde el 2026-08-19 los 7 endpoints exigen JWT: leer es cualquier usuario
// autenticado, y crear/editar/desactivar es solo admin. El token lo adjunta el
// interceptor de client.js; aca no hay que hacer nada.

// El backend capa el limit en 500 (Query(..., le=500)): pedir mas devuelve 422.
// Con el padron real de la empresa alcanza de sobra, y trae la lista PLANA
// (incluidos los inactivos) — el arbol se arma en el cliente con
// lib/arbolDepartamentos.js.
export const getDepartamentos = async () => {
  const response = await client.get(`${API_PREFIX}/departamentos/`, {
    params: { limit: 500 },
  });
  return response.data;
};

export const getDepartamento = async (id) => {
  const response = await client.get(`${API_PREFIX}/departamentos/${id}`);
  return response.data;
};

// El arbol ya armado por el backend. La pantalla de gestion NO lo usa: filtra
// `activo == True` solo en las raices (los hijos inactivos igual aparecen) y
// tiene tope de profundidad 5, asi que un departamento desactivado desaparece
// del listado y no habria forma de reactivarlo. Queda expuesto porque es el
// contrato del backend y sirve para vistas de solo lectura.
export const getArbolDepartamentos = async () => {
  const response = await client.get(`${API_PREFIX}/departamentos/raiz`);
  return response.data;
};

// id_padre: numero, o null para un departamento raiz.
export const crearDepartamento = async ({ nombre, codigo, id_padre = null }) => {
  const response = await client.post(`${API_PREFIX}/departamentos/`, {
    nombre,
    codigo,
    id_padre,
    activo: true,
  });
  return response.data;
};

export const actualizarDepartamento = async (id, data) => {
  const response = await client.put(`${API_PREFIX}/departamentos/${id}`, data);
  return response.data;
};

// OJO: es un SOFT delete (el backend pone activo = false, la fila no se borra) y
// responde 204 SIN BODY. Por eso no devuelve response.data: seria undefined y
// daria a entender que hubo una respuesta vacia cuando lo correcto es que no
// hay ninguna. Mismo caso documentado en eliminarEmpleado de api/empleados.js.
//
// El backend rechaza con 400 si el departamento tiene subdepartamentos activos,
// cargos asignados o empleados activos (RN-22). El detail trae el conteo exacto.
export const desactivarDepartamento = async (id) => {
  await client.delete(`${API_PREFIX}/departamentos/${id}`);
};

// La vuelta del soft-delete. No hay endpoint dedicado: se hace con el PUT
// generico. Sin esto, desactivar seria una puerta de una sola direccion y el
// unico arreglo posible seria tocar la base a mano.
export const reactivarDepartamento = async (id) => {
  const response = await client.put(`${API_PREFIX}/departamentos/${id}`, { activo: true });
  return response.data;
};
