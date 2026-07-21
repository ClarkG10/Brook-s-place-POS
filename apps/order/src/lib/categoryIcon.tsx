import {
  Blend,
  Citrus,
  Coffee,
  Cookie,
  CupSoda,
  GlassWater,
  IceCream,
  Leaf,
  Milk,
  Sandwich,
  type LucideIcon,
} from 'lucide-react';

// Maps the category's stored icon name (from the backend) to a Lucide icon.
const MAP: Record<string, LucideIcon> = {
  coffee: Coffee,
  'cup-soda': CupSoda,
  citrus: Citrus,
  blend: Blend,
  leaf: Leaf,
  cookie: Cookie,
  milk: Milk,
  'glass-water': GlassWater,
  'ice-cream': IceCream,
  sandwich: Sandwich,
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && MAP[name]) || GlassWater;
  return <Icon className={className} aria-hidden />;
}
