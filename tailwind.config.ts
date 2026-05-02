import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: '#f5ebe0',
          100: '#edd8cc',
          200: '#e2bfae',
          300: '#d4a286',
          400: '#c37d64',
          500: '#a55e48',
          600: '#854532',
          700: '#66352a',
          800: '#4b2720',
          900: '#32180f',
        },
        clay: {
          50: '#f8f1eb',
          100: '#eeded4',
          200: '#dcc4ac',
          300: '#c69f7d',
          400: '#ab7d59',
          500: '#8f5f42',
          600: '#724a35',
          700: '#563a2b',
          800: '#3d2a1f',
          900: '#2a1a15',
        },
      },
    },
  },
  plugins: [],
};
export default config;
