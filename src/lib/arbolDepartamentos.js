/**
 * Helpers de la jerarquia de departamentos.
 *
 * El backend expone GET /departamentos/raiz con el arbol ya anidado, pero la
 * pantalla de gestion NO lo usa: ese endpoint filtra `activo == True` solo en las
 * raices y tiene tope de profundidad 5. Un departamento desactivado desaparece
 * del listado, y sin verlo no hay forma de reactivarlo. Asi que la pantalla pide
 * la lista PLANA (GET /departamentos/, que incluye los inactivos) y arma el arbol
 * aca.
 *
 * Todo lo de este archivo es funcion pura: sin React, sin llamadas HTTP. Va en
 * lib/ y no en un componente, asi que puede exportar varias funciones sin
 * disparar react-refresh/only-export-components.
 *
 * Las tres funciones llevan un Set de visitados. NO es defensivo de mas: hasta el
 * 2026-08-19 el backend solo validaba el auto-padre, asi que puede haber datos
 * con un ciclo A -> B -> A. Un recorrido sin corte colgaria la pestaña del
 * navegador; con el corte, la pantalla se degrada y sigue andando.
 */

// Orden estable dentro de cada nivel. `localeCompare` con 'es' para que los
// acentos y la ñ queden donde un hispanohablante los espera.
const porNombre = (a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es');

/**
 * Lista plana -> array de raices, cada una con `hijos` y `nivel`.
 *
 * Un departamento cuyo id_padre no este en la lista se trata como RAIZ. Pasa en
 * dos situaciones reales: cuando se filtran los inactivos y el padre era uno de
 * ellos, y si el dato viniera inconsistente. En ambas, promoverlo es preferible a
 * descartarlo: un departamento que existe pero no se ve es peor que uno mal
 * ubicado.
 */
export const construirArbol = (lista = []) => {
  const porId = new Map(lista.map((d) => [d.id, d]));
  const hijosDe = new Map();

  lista.forEach((depto) => {
    // Trata como raiz tanto al que no tiene padre como al huerfano.
    const padreId = porId.has(depto.id_padre) ? depto.id_padre : null;
    if (!hijosDe.has(padreId)) hijosDe.set(padreId, []);
    hijosDe.get(padreId).push(depto);
  });

  const visitados = new Set();

  const construirNivel = (padreId, nivel) =>
    (hijosDe.get(padreId) || [])
      .slice()
      .sort(porNombre)
      .filter((depto) => {
        if (visitados.has(depto.id)) return false; // corte anti-ciclo
        visitados.add(depto.id);
        return true;
      })
      .map((depto) => ({
        ...depto,
        nivel,
        hijos: construirNivel(depto.id, nivel + 1),
      }));

  const raices = construirNivel(null, 0);

  // Rescate de los inalcanzables. Un ciclo corrupto (A -> B -> A) deja a sus dos
  // miembros SIN raiz: ninguno tiene id_padre null y cada uno cuelga del otro,
  // asi que el recorrido de arriba no llega nunca y ambos desaparecerian de la
  // pantalla en silencio. Justamente los departamentos rotos son los que el
  // admin necesita ver para poder arreglarlos, asi que se promueven a raiz.
  //
  // Este bloque tambien es lo que garantiza que aplanar el arbol devuelva
  // siempre tantas filas como departamentos entraron.
  lista.forEach((depto) => {
    if (visitados.has(depto.id)) return;
    visitados.add(depto.id);
    raices.push({ ...depto, nivel: 0, hijos: construirNivel(depto.id, 1) });
  });

  return raices;
};

/**
 * Arbol -> array plano en orden de lectura (padre, sus hijos, el siguiente
 * padre), conservando `nivel`.
 *
 * La tabla renderiza ESTO y no el arbol anidado: una <table> con un solo <tbody>
 * y la jerarquia expresada como indentacion. Anidar <table> dentro de <td> para
 * dibujar el arbol rompe la alineacion de las columnas y la semantica.
 */
export const aplanarArbol = (raices = []) => {
  const filas = [];

  const recorrer = (nodos) => {
    nodos.forEach((nodo) => {
      filas.push(nodo);
      recorrer(nodo.hijos || []);
    });
  };

  recorrer(raices);
  return filas;
};

/**
 * El id dado y todos sus descendientes, como Set.
 *
 * Se usa para excluirlos del selector de "departamento padre" al editar: colgar
 * un departamento de su propio hijo cerraria un ciclo. El backend tambien lo
 * rechaza (desde el 2026-08-19, con 400), pero un selector que ofrece opciones
 * invalidas y despues explica el error es peor que uno que no las ofrece.
 *
 * Incluye al propio id: un departamento tampoco puede ser su propio padre.
 */
export const descendientesDe = (lista = [], id) => {
  const excluidos = new Set();
  if (id === null || id === undefined) return excluidos;

  const hijosDe = new Map();
  lista.forEach((depto) => {
    if (!hijosDe.has(depto.id_padre)) hijosDe.set(depto.id_padre, []);
    hijosDe.get(depto.id_padre).push(depto.id);
  });

  const pendientes = [id];
  while (pendientes.length > 0) {
    const actual = pendientes.pop();
    if (excluidos.has(actual)) continue; // corte anti-ciclo
    excluidos.add(actual);
    pendientes.push(...(hijosDe.get(actual) || []));
  }

  return excluidos;
};

/**
 * Cuantos subdepartamentos ACTIVOS y directos tiene cada id.
 *
 * Es lo que permite deshabilitar el boton de desactivar antes de mandar el
 * request: el backend rechaza con 400 exactamente ese caso (RN-22), y conviene
 * decirlo antes y no despues. Sobre cargos y empleados no se puede hacer lo
 * mismo — no hay endpoint de conteo — asi que esos dos se dejan al 400.
 */
export const contarHijosActivos = (lista = []) => {
  const conteo = new Map();

  lista.forEach((depto) => {
    if (!depto.activo || depto.id_padre === null || depto.id_padre === undefined) return;
    conteo.set(depto.id_padre, (conteo.get(depto.id_padre) || 0) + 1);
  });

  return conteo;
};
