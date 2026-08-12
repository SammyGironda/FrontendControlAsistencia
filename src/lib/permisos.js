// Helpers de rol para ocultar UI.
//
// IMPORTANTE: esto es SOLO cosmetico. La autorizacion real vive en el backend
// (require_admin / require_roles en app/core/deps.py); ocultar un boton no
// protege nada. Sirve para no ofrecerle al usuario una accion que el backend
// le va a rechazar con 403.
//
// El objeto `user` viene de POST /api/v1/auth/login y expone:
// { id, username, id_rol, nombre_rol, id_empleado }.
// La comparacion es case-insensitive igual que app/core/deps.py:134.

export const esAdmin = (user) => (user?.nombre_rol || '').toLowerCase() === 'admin';

// admin + rrhh. Espeja ROLES_GESTORES de app/core/deps.py, el conjunto que el
// backend usa para "puede gestionar registros de cualquier empleado".
//
// Ojo al usarlo: esGestor NO implica esAdmin. Hay endpoints donde rrhh lee pero
// no escribe (GET vs POST de /compensaciones-horas-extra), asi que la pantalla
// tiene que preguntar por el permiso que corresponde a cada accion, no por uno
// solo.
export const esGestor = (user) =>
  ['admin', 'rrhh'].includes((user?.nombre_rol || '').toLowerCase());
