/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gov: {
          blue: {
            DEFAULT: '#1351b4',
            dark: '#0c326f',
            light: '#2670e8',
            subtle: '#eaf2fe'
          },
          green: {
            DEFAULT: '#168821',
            dark: '#106418',
            light: '#22a730'
          },
          warm: '#f8f9fa',
          surface: '#ffffff'
        },
        dark: {
          bg: '#0b0f19',
          surface: '#111827',
          card: '#1e293b',
          border: '#334155',
          accent: '#38bdf8',
          amber: '#f59e0b',
          emerald: '#10b981'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'Menlo', 'monospace']
      }
    },
  },
  plugins: [],
}
