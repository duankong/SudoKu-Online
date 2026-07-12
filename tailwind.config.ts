import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#3654D2', light: '#DDE6F9', pale: '#ECF1FB' },
        accent: '#E4C779',
        ink: {
          dark: '#2C2C2E',
          DEFAULT: '#48484A',
          mid: '#8E8E93',
          light: '#B0B0B8',
        },
        border: '#D0D7E5',
        'border-box': '#3654D2',
        'bg-board': '#F8F9FC',
        'bg-cell': '#F2F4F8',
        error: '#E53935',
      },
      fontSize: {
        cell: ['1.75rem', { lineHeight: '1' }],
        note: ['0.65rem', { lineHeight: '1.2' }],
      },
      keyframes: {
        'hint-flash': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'hint-flash': 'hint-flash 0.5s ease-in-out 3',
        'shake': 'shake 0.3s ease-in-out',
        'pop-in': 'pop-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
