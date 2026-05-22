/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B1120',
        surface: '#131B2E',
        border: '#1E293B',
        physical: '#22C55E',
        mental: '#60A5FA',
        financial: '#FBBF24',
        spiritual: '#C084FC',
        social: '#F472B6',
        purpose: '#F97316',
        awareness: '#14B8A6',
        teal: '#14B8A6',
        violet: '#8B5CF6',
        psychological: '#F472B6',
        cognitive: '#06B6D4',
        ontological: '#F97316',
        'text-primary': '#F8FAFC',
        'text-muted': '#64748B',
      },
      fontFamily: {
        display: ['Inter', 'Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
