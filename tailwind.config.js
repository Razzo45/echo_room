const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', ...defaultTheme.fontFamily.sans],
        display: ['var(--font-oxanium)', 'var(--font-ibm-plex-sans)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-jetbrains-mono)', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        primary: {
          50: '#f3f6fa',
          100: '#e8eef5',
          200: '#c5ced9',
          300: '#8b9bb0',
          400: '#4b5565',
          500: '#1d4ed8',
          600: '#16345a',
          700: '#0b1f3a',
          800: '#071526',
          900: '#05070d',
        },
        corridor: {
          ink: '#0b1f3a',
          steel: '#4b5565',
          fog: '#f3f6fa',
          mist: '#e8eef5',
          hairline: '#c5ced9',
          signal: '#1d4ed8',
        },
        echovoid: {
          void: '#05070d',
          panel: '#0c1220',
          cyan: '#00e5ff',
          magenta: '#ff2a6d',
          amber: '#ffc14a',
          chrome: '#d7dee8',
          dim: '#7a8799',
        },
        quest: {
          50: '#f3f6fa',
          100: '#e8eef5',
          200: '#c5ced9',
          300: '#8b9bb0',
          400: '#4b5565',
          500: '#0b1f3a',
          600: '#16345a',
          700: '#0b1f3a',
          800: '#071526',
          900: '#05070d',
        },
        org: {
          bg: '#0b1f3a',
          surface: '#122846',
          border: '#2a4060',
          accent: '#3b82f6',
          text: '#e8eef5',
        },
        admin: {
          bg: '#071526',
          surface: '#0f2238',
          border: '#243b57',
          accent: '#38bdf8',
          text: '#f3f6fa',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(11, 31, 58, 0.08)',
        glowQuest: '0 0 18px rgba(0, 229, 255, 0.35)',
        glowOrg: '0 0 12px rgba(59, 130, 246, 0.25)',
        glowCyan: '0 0 24px rgba(0, 229, 255, 0.45)',
        glowMagenta: '0 0 24px rgba(255, 42, 109, 0.4)',
      },
    },
  },
  plugins: [],
};
