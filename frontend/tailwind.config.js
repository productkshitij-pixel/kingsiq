/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kings: {
          navy:       '#002D72',   // Royal blue — primary brand
          'navy-800': '#013A8F',
          'navy-900': '#001E50',
          gold:       '#C9A227',   // Kings gold — accent / active
          'gold-50':  '#FDF8EC',   // Very light gold background
          'gold-100': '#F5E8C0',   // Light gold
          'gold-200': '#EBD27A',   // Mid gold
          crimson:    '#C41230',   // Kings red — secondary accent
          charcoal:   '#2D2D2D',   // Brand body text
        },
      },
      fontFamily: {
        sans:    ['Raleway', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
