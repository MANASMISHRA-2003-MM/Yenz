/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1320px' },
    },
    extend: {
      colors: {
        cravings: {
          50: '#FFF0F3', 100: '#FFE1E7', 200: '#FFC4CF', 300: '#FF97AA', 400: '#FF5C79',
          500: '#E51B4B', 600: '#B90F38', 700: '#94072B', 800: '#750926', 900: '#600D24',
        },
        fresh: {
          50: '#ECF8F1', 100: '#D2F0E0', 200: '#A8E2C4', 300: '#75CEA2', 400: '#41B37D',
          500: '#168A5B', 600: '#0F6945', 700: '#0B5136', 800: '#0B412C', 900: '#093625',
        },
        brand: { 50: '#FFF0F3', 100: '#FFE1E7', 500: '#E51B4B', 600: '#B90F38', 700: '#94072B' },
        gray: {
          50: '#F9F9F9', 100: '#f0f3f2', 200: '#ecf0ef', 300: '#dfe2e1', 400: '#c1c7c6',
          500: '#889397', 600: '#5c6c75', 700: '#3d4f58', 800: '#21313c', 900: '#001e2b', 950: '#00131C',
        },
      },
      fontFamily: { sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'], heading: ['Inter', 'sans-serif'] },
      boxShadow: {
        soft: '0 1px 2px rgba(33,49,60,.04)',
        'soft-lg': '0 8px 20px rgba(33,49,60,.08)',
        'soft-xl': '0 16px 36px rgba(33,49,60,.12)',
      },
      borderRadius: { fc: '.5rem' },
    },
  },
  plugins: [],
};
