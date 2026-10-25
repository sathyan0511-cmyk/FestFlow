/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Newsreader"', 'Georgia', 'serif'],
      },
      colors: {
        ink: {
          primary: '#191919',
          secondary: '#353535',
          muted: '#77766F',
          faint: '#A6A49B',
        },
        canvas: {
          warm: '#F7F5F0',
          muted: '#EFEEE8',
          paper: '#FAF9F5',
        },
        surface: {
          primary: '#FFFFFF',
          secondary: '#EFEEE8',
          card: '#FCFBF9',
        },
        accent: {
          DEFAULT: '#D94B35',
          hover: '#B93827',
          subtle: '#FDF2F0',
          border: '#F2D3CD',
        },
        edge: {
          DEFAULT: '#E2E0D8',
          light: '#EDEBE4',
          dark: '#D0CDC4',
        },
        campus: {
          success: '#237A57',
          'success-subtle': '#EBF4F0',
          warning: '#A96912',
          'warning-subtle': '#FDF6EC',
          error: '#B93838',
          'error-subtle': '#FDF2F2',
        }
      },
      boxShadow: {
        'fest-sm': '0 1px 2px rgba(25, 25, 25, 0.04)',
        'fest-md': '0 4px 12px rgba(25, 25, 25, 0.06)',
        'fest-lg': '0 10px 24px -4px rgba(25, 25, 25, 0.08)',
      }
    },
  },
  plugins: [],
}
