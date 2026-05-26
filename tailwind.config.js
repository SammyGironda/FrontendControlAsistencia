/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#03178C',
          light: '#0D2D8C',
          hover: '#021266',
        },
        accent: {
          DEFAULT: '#D9A404',
          hover: '#A67C03',
        },
        success:  '#376644',
        danger:   '#731B07',
        warning:  '#E19F0C',
        inactive: '#777F8F',
        surface:  '#F2F2F2',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}