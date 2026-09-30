/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cravings: {
          50: '#FFF0F3',
          100: '#FFE1E7',
          200: '#FFC4CF',
          300: '#FF97AA',
          400: '#FF5C79',
          500: '#E51B4B', // Signature Craving Red
          600: '#B90F38',
          700: '#94072B',
          800: '#750926',
          900: '#600D24',
        },
        fresh: {
          50: '#ECF8F1',
          100: '#D2F0E0',
          200: '#A8E2C4',
          300: '#75CEA2',
          400: '#41B37D',
          500: '#168A5B', // Signature Fresh Mandi Emerald
          600: '#0F6945',
          700: '#0B5136',
          800: '#0B412C',
          900: '#093625',
        },
        brand: {
          50: '#FFF0F3',
          100: '#FFE1E7',
          500: '#E51B4B',
          600: '#B90F38',
          700: '#94072B',
        },
        surface: {
          50: '#FAFAF8',
          100: '#F5F6F7',
          200: '#E8E9ED',
          300: '#CBD5E1',
          800: '#17181C',
          900: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['Plus Jakarta Sans', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(17, 24, 39, 0.04), 0 1px 3px rgba(17, 24, 39, 0.02)',
        'soft-lg': '0 12px 32px rgba(17, 24, 39, 0.08), 0 4px 12px rgba(17, 24, 39, 0.03)',
        'soft-xl': '0 20px 48px rgba(17, 24, 39, 0.12), 0 8px 24px rgba(17, 24, 39, 0.05)',
      }
    },
  },
  plugins: [],
}

