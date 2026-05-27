# Frontend

Aplicación React moderna construida con Vite, diseñada para proporcionar una experiencia de usuario rápida y reactiva con componentes escalables y mantenibles.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalados:

- **Node.js** (versión 18 o superior)
- **npm** (versión 9 o superior) o **yarn**

Puedes verificar las versiones instaladas con:

```bash
node --version
npm --version
```

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd Frontend
```

### 2. Instalar dependencias

```bash
npm install
```

Este comando instalará todas las dependencias especificadas en `package.json`, incluyendo:

- **react** - Librería de UI
- **react-router-dom** - Enrutamiento de aplicación
- **react-hook-form** - Gestión de formularios
- **@tanstack/react-query** - Gestión de estado asincrónico
- **zustand** - Gestión de estado global
- **axios** - Cliente HTTP
- **tailwindcss** - Framework CSS utility
- **zod** - Validación de esquemas
- Y más dependencias de utilidad

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto (si es necesario):

```bash
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=MyApp
```

**Nota:** Las variables deben comenzar con `VITE_` para ser accesibles en el cliente.

### Archivos de Configuración

- **vite.config.js** - Configuración de Vite y plugins
- **tailwind.config.js** - Configuración de Tailwind CSS
- **postcss.config.js** - Configuración de PostCSS
- **eslint.config.js** - Reglas de linting

## 🏃 Ejecución

### Desarrollo

Para iniciar el servidor de desarrollo con Hot Module Replacement (HMR):

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173` (o el puerto que Vite indique).

### Build (Producción)

Para compilar la aplicación para producción:

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/`.

### Preview

Para ver una vista previa de la build de producción:

```bash
npm run preview
```

### Linting

Para verificar la calidad del código:

```bash
npm run lint
```

Para corregir automáticamente algunos problemas:

```bash
npm run lint -- --fix
```

## 📁 Estructura del Proyecto

```
Frontend/
├── public/              # Archivos estáticos
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── pages/           # Páginas de la aplicación
│   ├── hooks/           # Custom hooks
│   ├── store/           # Estado global (Zustand)
│   ├── api/             # Servicios y llamadas API (Axios)
│   ├── lib/             # Utilidades y funciones auxiliares
│   ├── assets/          # Imágenes y recursos
│   ├── App.jsx          # Componente raíz
│   ├── main.jsx         # Punto de entrada
│   ├── App.css          # Estilos globales
│   └── index.css        # Estilos base
├── .gitignore           # Archivos ignorados por Git
├── package.json         # Dependencias y scripts
├── package-lock.json    # Lock file para reproducibilidad
├── vite.config.js       # Configuración de Vite
├── tailwind.config.js   # Configuración de Tailwind CSS
├── postcss.config.js    # Configuración de PostCSS
├── eslint.config.js     # Configuración de ESLint
├── index.html           # HTML de entrada
└── README.md            # Este archivo
```

## 🛠️ Stack Tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| **React** | 19.2 | Librería de UI |
| **Vite** | 8.0 | Build tool y dev server |
| **React Router** | 7.15 | Enrutamiento |
| **Zustand** | 5.0 | Gestión de estado |
| **React Query** | 5.100 | Gestión de datos async |
| **React Hook Form** | 7.76 | Gestión de formularios |
| **Tailwind CSS** | 3.4 | Estilos |
| **Axios** | 1.16 | Cliente HTTP |
| **Zod** | 4.4 | Validación de esquemas |
| **Lucide React** | 1.16 | Iconos |
| **Date-fns** | 4.3 | Utilidades de fechas |
| **ESLint** | 10.0 | Linting |

## 💡 Guía de Desarrollo

### Crear un Componente

```jsx
// src/components/MyComponent.jsx
export default function MyComponent() {
  return <div>Mi componente</div>;
}
```

### Crear una Página

```jsx
// src/pages/HomePage.jsx
export default function HomePage() {
  return <h1>Home</h1>;
}
```

### Usar State Global con Zustand

```jsx
// src/store/useAppStore.js
import { create } from 'zustand';

export const useAppStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

### Hacer Llamadas API

```jsx
// src/api/users.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};
```

### Usar React Query

```jsx
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../api/users';

export default function UsersList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {data?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## 🔍 Debugging

### VS Code Debugger

Añade esta configuración en `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### React DevTools

Se recomienda instalar la extensión [React DevTools](https://react-devtools-tutorial.vercel.app/) en el navegador para debugging mejorado.

## 📦 Build y Deploy

### Generar Build para Producción

```bash
npm run build
```

Esto creará una carpeta `dist/` lista para desplegar.

### Optimizaciones Aplicadas

- ✅ Code splitting automático
- ✅ Minificación de assets
- ✅ Optimización de imágenes
- ✅ Tree shaking de dependencias no usadas

## 🐛 Troubleshooting

### Puerto 5173 ya está en uso

```bash
npm run dev -- --port 3000
```

### Limpiar caché de Vite

```bash
rm -rf node_modules .vite
npm install
npm run dev
```

### Problemas con dependencias

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 📝 Licencia

Este proyecto está bajo licencia [MIT](LICENSE).

## 👥 Contacto

Para preguntas o sugerencias, contacta al equipo de desarrollo.

---

**Última actualización:** Mayo 2026
