// Helpers puros (sin React) para el calendario de vacaciones y ausencias.
//
// El backend guarda vacaciones, licencias y viajes de trabajo como UN registro
// con fecha_inicio + fecha_fin, no como una fila por dia. Para pintarlos en un
// calendario mensual hay que expandir cada rango a los dias que ocupa.

// Tope de seguridad: una fecha corrupta en la base no debe colgar el navegador
// dentro del while de expandirRango.
const MAX_DIAS_RANGO = 400;

// -----------------------------------------------------------------------
// Paleta y etiquetas
// -----------------------------------------------------------------------
// Familia turquesa = vacacion (con y sin goce se distinguen por intensidad de
// fondo y por el borde punteado), azul = feriado, naranja = viaje de trabajo,
// morado = licencia. El azul del feriado y el morado de la licencia son los
// mismos que ya usa pages/asistencia/AsistenciaPage.jsx para esos conceptos.

export const TIPO_DIA_CONFIG = {
  vacacion_goce: {
    label: 'Vacación c/goce',
    corto: 'Vac. c/goce',
    bg: '#E6FFFA',
    text: '#285E61',
    border: '#81E6D9',
    borderStyle: 'solid',
    prioridad: 3,
  },
  vacacion_sin_goce: {
    label: 'Vacación s/goce',
    corto: 'Vac. s/goce',
    bg: '#F0FDFA',
    text: '#285E61',
    border: '#81E6D9',
    borderStyle: 'dashed',
    prioridad: 3,
  },
  licencia_accidente: {
    label: 'Licencia por accidente',
    corto: 'Licencia',
    bg: '#FAF5FF',
    text: '#6B46C1',
    border: '#D6BCFA',
    borderStyle: 'solid',
    prioridad: 3,
  },
  viaje_trabajo: {
    label: 'Viaje de trabajo',
    corto: 'Viaje',
    bg: '#FFF7ED',
    text: '#9A3412',
    border: '#FDBA74',
    borderStyle: 'solid',
    prioridad: 2,
  },
  feriado_nacional: {
    label: 'Feriado nacional',
    corto: 'Feriado',
    bg: '#EBF4FF',
    text: '#03178C',
    border: '#C7D2FE',
    borderStyle: 'solid',
    prioridad: 1,
  },
  feriado_departamental: {
    label: 'Feriado departamental',
    corto: 'Feriado',
    bg: '#F5F8FF',
    text: '#03178C',
    border: '#DBEAFE',
    borderStyle: 'solid',
    prioridad: 1,
  },
};

// tipo_vacacion del backend -> clave de TIPO_DIA_CONFIG
const TIPO_VACACION_A_CONFIG = {
  goce_de_haber: 'vacacion_goce',
  sin_goce_de_haber: 'vacacion_sin_goce',
  licencia_accidente: 'licencia_accidente',
};

// Solo estas solicitudes ocupan el calendario. 'solicitado' todavia no esta
// aprobado, y 'rechazado'/'cancelado' nunca ocurrieron.
export const ESTADOS_DETALLE_VISIBLES = ['aprobado', 'tomado'];

export const ESTADO_DETALLE_LABEL = {
  solicitado: 'Solicitado',
  aprobado: 'Aprobado',
  tomado: 'Tomado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

export const TIPO_VACACION_LABEL = {
  goce_de_haber: 'Vacación con goce de haber',
  sin_goce_de_haber: 'Vacación sin goce de haber',
  licencia_accidente: 'Licencia por accidente',
};

export const TIPO_JUSTIFICACION_LABEL = {
  permiso_personal: 'Permiso personal',
  licencia_medica_accidente: 'Licencia médica / accidente',
  cumpleanos: 'Cumpleaños',
  vacacion_por_horas: 'Vacación por horas',
  viaje_trabajo: 'Viaje de trabajo',
};

// -----------------------------------------------------------------------
// Fechas
// -----------------------------------------------------------------------

// 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm:ss' -> Date local (sin desfase de zona).
// new Date('2026-08-11') se interpreta como UTC y en Bolivia (UTC-4) cae el
// dia anterior, por eso se parsea a mano.
export const parsearFechaLocal = (valor) => {
  if (!valor) return null;
  if (valor instanceof Date) return valor;

  const [anio, mes, dia] = String(valor).slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return null;

  return new Date(anio, mes - 1, dia);
};

// Date -> 'YYYY-MM-DD' usando componentes locales
export const claveFecha = (date) => {
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mes}-${dia}`;
};

// 'YYYY-MM-DD' -> 'MM-DD'. Los feriados se tratan como recurrentes por dia+mes:
// el endpoint /feriados/aplicables/{dia}/{mes}/{depto} ignora el anio.
export const claveDiaMes = (valor) => String(valor).slice(5, 10);

// Primer y ultimo dia del mes, como 'YYYY-MM-DD'
export const primerDiaMes = (anio, mes) => claveFecha(new Date(Number(anio), Number(mes) - 1, 1));
export const ultimoDiaMes = (anio, mes) => claveFecha(new Date(Number(anio), Number(mes), 0));

// Ventana ampliada: del primer dia del mes anterior al ultimo del mes siguiente.
//
// Existe porque los filtros fecha_desde/fecha_hasta del backend son de
// CONTENCION, no de solapamiento: filtran fecha_inicio >= desde AND
// fecha_fin <= hasta. Pidiendo justo el mes visible, una solicitud del 28-ene
// al 3-feb no vuelve. Ampliando un mes a cada lado si vuelve, y expandirRango
// se encarga de recortarla al mes que se esta mostrando.
export const ventanaAmpliada = (anio, mes) => {
  const anioNum = Number(anio);
  const mesNum = Number(mes);

  return {
    fecha_desde: claveFecha(new Date(anioNum, mesNum - 2, 1)),
    fecha_hasta: claveFecha(new Date(anioNum, mesNum + 1, 0)),
  };
};

// Expande [fechaInicio, fechaFin] a las claves 'YYYY-MM-DD' que caen dentro
// del mes visible. Devuelve [] si el rango no toca ese mes.
export const expandirRango = (fechaInicio, fechaFin, anio, mes) => {
  const inicio = parsearFechaLocal(fechaInicio);
  const fin = parsearFechaLocal(fechaFin);
  if (!inicio || !fin || fin < inicio) return [];

  const anioNum = Number(anio);
  const mesNum = Number(mes);
  const inicioMes = new Date(anioNum, mesNum - 1, 1);
  const finMes = new Date(anioNum, mesNum, 0);

  // Recorte al mes visible
  const desde = inicio > inicioMes ? inicio : inicioMes;
  const hasta = fin < finMes ? fin : finMes;
  if (desde > hasta) return [];

  const claves = [];
  const cursor = new Date(desde);

  while (cursor <= hasta && claves.length < MAX_DIAS_RANGO) {
    claves.push(claveFecha(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return claves;
};

// -----------------------------------------------------------------------
// Construccion del mapa de dias
// -----------------------------------------------------------------------

// Devuelve Map<'YYYY-MM-DD', { items: [...] }>.
//
// Cada item: { tipo, idEmpleado, etiqueta, detalle, config }
// 'tipo' es una clave de TIPO_DIA_CONFIG. Un mismo dia puede acumular varios
// items (por ejemplo feriado + vacacion); el fondo de la celda lo define el de
// mayor prioridad, que resuelve estiloDelDia().
//
// vacacionPorId: Map<id_vacacion, id_empleado>, necesario porque
// DetalleVacacionResponse no incluye id_empleado.
export const construirMapaDias = ({
  detalles = [],
  viajes = [],
  feriados = [],
  vacacionPorId = new Map(),
  anio,
  mes,
}) => {
  const mapa = new Map();

  const agregar = (clave, item) => {
    if (!mapa.has(clave)) {
      mapa.set(clave, { items: [] });
    }
    mapa.get(clave).items.push(item);
  };

  // Vacaciones y licencias aprobadas o ya tomadas
  detalles
    .filter((detalle) => ESTADOS_DETALLE_VISIBLES.includes(detalle.estado))
    .forEach((detalle) => {
      const tipo = TIPO_VACACION_A_CONFIG[detalle.tipo_vacacion];
      if (!tipo) return;

      const idEmpleado = vacacionPorId.get(detalle.id_vacacion) ?? null;

      expandirRango(detalle.fecha_inicio, detalle.fecha_fin, anio, mes).forEach((clave) => {
        agregar(clave, {
          tipo,
          idEmpleado,
          etiqueta: TIPO_DIA_CONFIG[tipo].corto,
          detalle,
          config: TIPO_DIA_CONFIG[tipo],
        });
      });
    });

  // Viajes de trabajo aprobados. NO son tiempo libre: el empleado esta
  // trabajando fuera de la oficina, por eso se pintan aparte de las vacaciones.
  viajes.forEach((justificacion) => {
    expandirRango(justificacion.fecha_inicio, justificacion.fecha_fin, anio, mes).forEach((clave) => {
      agregar(clave, {
        tipo: 'viaje_trabajo',
        idEmpleado: justificacion.id_empleado ?? null,
        etiqueta: TIPO_DIA_CONFIG.viaje_trabajo.corto,
        detalle: justificacion,
        config: TIPO_DIA_CONFIG.viaje_trabajo,
      });
    });
  });

  // Feriados: match por dia+mes, no por fecha exacta, porque se repiten cada anio
  const diasDelMes = new Map();
  feriados.forEach((feriado) => {
    if (feriado.activo === false) return;
    const diaMes = claveDiaMes(feriado.fecha);
    if (!diasDelMes.has(diaMes)) {
      diasDelMes.set(diaMes, []);
    }
    diasDelMes.get(diaMes).push(feriado);
  });

  const ultimoDia = new Date(Number(anio), Number(mes), 0).getDate();
  for (let dia = 1; dia <= ultimoDia; dia += 1) {
    const fecha = new Date(Number(anio), Number(mes) - 1, dia);
    const clave = claveFecha(fecha);
    const coincidencias = diasDelMes.get(clave.slice(5, 10)) || [];

    coincidencias.forEach((feriado) => {
      const esDepartamental = feriado.ambito === 'DEPARTAMENTAL';
      const tipo = esDepartamental ? 'feriado_departamental' : 'feriado_nacional';
      const etiqueta = esDepartamental
        ? `Feriado (${feriado.codigo_departamento || '—'})`
        : 'Feriado';

      agregar(clave, {
        tipo,
        idEmpleado: null,
        etiqueta,
        detalle: feriado,
        config: TIPO_DIA_CONFIG[tipo],
      });
    });
  }

  return mapa;
};

// Fondo y borde de la celda: manda el item de mayor prioridad
// (vacacion > viaje > feriado).
export const estiloDelDia = (entrada) => {
  if (!entrada || entrada.items.length === 0) return {};

  const principal = entrada.items.reduce((mejor, item) =>
    item.config.prioridad > mejor.config.prioridad ? item : mejor
  );

  return {
    backgroundColor: principal.config.bg,
    borderColor: principal.config.border,
  };
};

// Nombre visible de un empleado. EmpleadoResponse no expone nombre_completo:
// la property existe solo en el modelo de SQLAlchemy y Pydantic no la serializa.
export const nombreEmpleado = (empleado) => {
  if (!empleado) return 'Empleado desconocido';
  const nombre = `${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim();
  return nombre || `Empleado ${empleado.id}`;
};
