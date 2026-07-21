import preset from '../../packages/ui/tailwind.preset.cjs';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Handwritten display (greetings, section titles) + friendly rounded body.
        display: ['Caveat', 'ui-serif', 'cursive'],
        hand: ['Caveat', 'ui-serif', 'cursive'],
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      rotate: {
        'sketch-1': '-1.2deg',
        'sketch-2': '1.4deg',
      },
    },
  },
};
