/**
 * Shared Tailwind preset. Maps semantic color tokens to the runtime CSS variables
 * (set per-surface by applyTheme), so `bg-primary`, `text-muted-foreground`, etc.
 * all follow the live palette. Both apps extend this preset.
 */
const hsl = (v) => `hsl(var(--${v}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: hsl('border'),
        input: hsl('input'),
        ring: hsl('ring'),
        background: hsl('background'),
        foreground: hsl('foreground'),
        primary: { DEFAULT: hsl('primary'), foreground: hsl('primary-foreground') },
        accent: { DEFAULT: hsl('accent'), foreground: hsl('accent-foreground') },
        card: { DEFAULT: hsl('card'), foreground: hsl('card-foreground') },
        muted: { DEFAULT: hsl('muted'), foreground: hsl('muted-foreground') },
        success: { DEFAULT: hsl('success'), foreground: hsl('success-foreground') },
        warning: { DEFAULT: hsl('warning'), foreground: hsl('warning-foreground') },
        danger: { DEFAULT: hsl('danger'), foreground: hsl('danger-foreground') },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 0.35rem)',
        sm: 'calc(var(--radius) - 0.6rem)',
      },
    },
  },
  plugins: [],
};
