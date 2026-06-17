import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f6f2',
          100: '#d1e8d9',
          200: '#a3d1b3',
          300: '#6db88a',
          400: '#3f9a65',
          500: '#2a7049',
          600: '#1a3a2a',
          700: '#122b1f',
          800: '#0a1c14',
          900: '#050e0a',
        },
      },
    },
  },
  plugins: [],
}

export default config
