import { ChevronDown } from 'lucide-react';

// Select con etiqueta. Extraido de pages/asistencia/AsistenciaPage.jsx para
// que las pantallas de Asistencia y Vacaciones compartan los mismos filtros.
const SelectField = ({ label, value, onChange, children }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[11px] font-medium text-[#718096]">{label}</span>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="h-9 w-full appearance-none rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-2 pr-9 text-[13px] text-[#1A202C] outline-none"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718096]" />
    </div>
  </label>
);

export default SelectField;
