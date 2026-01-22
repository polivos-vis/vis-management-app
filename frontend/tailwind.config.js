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
          50: '#ecfff3',
          100: '#d1ffe1',
          200: '#a7ffc4',
          300: '#7effa8',
          400: '#66ff95',
          500: '#5aff84',
          600: '#34e56a',
          700: '#1cbc52',
          800: '#139342',
          900: '#0f7335',
        },
        secondary: {
          50: '#f0f2f1',
          100: '#d9dedc',
          200: '#b7bfbc',
          300: '#8f9b97',
          400: '#687571',
          500: '#4a5552',
          600: '#343e3a',
          700: '#27302d',
          800: '#1b2321',
          900: '#0f1513',
        },
        accent: {
          50: '#fff5d6',
          100: '#fde7ad',
          200: '#f6cf72',
          300: '#eeb748',
          400: '#e1a02b',
          500: '#c9871c',
          600: '#a46a13',
          700: '#7c4f0f',
          800: '#5b3a0c',
          900: '#3d2709',
        },
      },
    },
  },
  plugins: [],
}
