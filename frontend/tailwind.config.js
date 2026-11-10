/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        // Civic-Tech Forest & Emerald Palette
        forest: {
          950: '#0B241F',
          900: '#123B32',
          800: '#184C41',
          700: '#1F6153',
          600: '#2A7A69',
          500: '#389682',
          100: '#E4EFEA',
          50: '#F0FAF5',
        },
        emerald: {
          900: '#0E5242',
          800: '#116853',
          700: '#137961',
          600: '#16856A',
          500: '#1CA382',
          400: '#34D399',
          300: '#6EE7B7',
          200: '#A7F3D0',
          100: '#DDF4E9',
          50: '#F0FAF5',
        },
        mint: {
          DEFAULT: '#DDF4E9',
          subtle: '#F0FAF5',
          light: '#EBF7F1',
          dark: '#BDE8D3',
        },
        lime: {
          DEFAULT: '#B9E769',
          accent: '#B9E769',
          light: '#D3F49A',
          subtle: '#EAF9CC',
          dark: '#93C440',
        },
        civic: {
          bg: '#F7F8F5',
          card: '#FFFFFF',
          heading: '#172923',
          body: '#526059',
          muted: '#7E8E86',
          border: '#E5EAE5',
          'border-subtle': '#EEF2EE',
        },
        // Semantic Status Colors
        status: {
          submitted: {
            bg: '#F1F5F9',
            text: '#475569',
            border: '#CBD5E1',
          },
          review: {
            bg: '#EFF6FF',
            text: '#1D4ED8',
            border: '#BFDBFE',
          },
          progress: {
            bg: '#FEF3C7',
            text: '#B45309',
            border: '#FDE68A',
          },
          resolved: {
            bg: '#DDF4E9',
            text: '#123B32',
            border: '#BDE8D3',
          },
          rejected: {
            bg: '#FFE4E6',
            text: '#BE123C',
            border: '#FECDD3',
          },
        },
      },
      boxShadow: {
        'card-sm': '0 1px 3px rgba(18, 59, 50, 0.05), 0 1px 2px rgba(18, 59, 50, 0.03)',
        'card': '0 4px 6px -1px rgba(18, 59, 50, 0.06), 0 2px 4px -2px rgba(18, 59, 50, 0.04)',
        'card-hover': '0 12px 24px -4px rgba(18, 59, 50, 0.08), 0 4px 8px -2px rgba(18, 59, 50, 0.04)',
        'modal': '0 20px 25px -5px rgba(18, 59, 50, 0.1), 0 8px 10px -6px rgba(18, 59, 50, 0.06)',
      },
      // Reduced, sharper, more professional border-radii
      borderRadius: {
        '3xl': '0.75rem',  // 12px instead of 24px
        '2xl': '0.5rem',   // 8px instead of 16px
        'xl': '0.375rem',  // 6px instead of 12px
        'lg': '0.25rem',   // 4px instead of 8px
        'md': '0.25rem',   // 4px instead of 6px
      },
    },
  },
  plugins: [],
};
