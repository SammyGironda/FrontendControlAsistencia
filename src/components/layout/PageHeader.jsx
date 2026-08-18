/**
 * Encabezado unico de todas las pantallas montadas bajo MainLayout.
 *
 * Reemplaza a components/layout/Header.jsx, que traia hardcodeado un breadcrumb,
 * la fecha de hoy y un boton "Importar Excel" que heredaban todas las pantallas
 * que lo importaban, ademas de no aceptar children (el badge de
 * ResolucionIncidencias se descartaba en silencio, sin warning de React).
 *
 * El slot derecho es la prop `actions` y NO children, a proposito: deja explicito
 * que solo admite acciones del lado derecho y no contenido de la pagina.
 */
const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
    </div>
    {/* Sin acciones no se renderiza el div: un flex item vacio correria el
        justify-between y desalinearia el titulo. */}
    {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
  </div>
);

export default PageHeader;
