import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2c3e50',
        accent: '#3498db',
        danger: '#e74c3c',
        success: '#2ecc71',
      },
    },
  },
  plugins: [],
}
export default config
