<?php

/**
 * Selectable color palettes for each surface.
 *
 * Token values are HSL channels ("H S% L%") so the frontends can drop them straight
 * into CSS variables:  --primary: <value>;  ->  hsl(var(--primary)).
 * The Settings screen lets staff pick a palette per surface; the chosen palette is
 * stored on the `settings` row (public_theme / admin_theme) and served by the API.
 */
return [

    // Customer ordering app — bright, appetizing, light only.
    'public' => [
        'espresso' => [
            'label' => 'Espresso (warm brown)',
            'tokens' => [
                'primary' => '25 65% 31%', 'primary-foreground' => '36 33% 97%',
                'accent' => '32 95% 44%',  'accent-foreground' => '25 40% 15%',
                'background' => '36 33% 97%', 'foreground' => '25 25% 15%',
                'card' => '0 0% 100%', 'muted' => '36 20% 92%', 'muted-foreground' => '25 12% 42%',
                'border' => '30 18% 86%', 'ring' => '32 95% 44%', 'radius' => '1rem',
            ],
        ],
        'matcha' => [
            'label' => 'Matcha (green)',
            'tokens' => [
                'primary' => '146 45% 28%', 'primary-foreground' => '120 33% 97%',
                'accent' => '84 60% 45%', 'accent-foreground' => '146 40% 12%',
                'background' => '120 25% 97%', 'foreground' => '150 20% 14%',
                'card' => '0 0% 100%', 'muted' => '120 18% 92%', 'muted-foreground' => '150 10% 40%',
                'border' => '130 16% 85%', 'ring' => '84 60% 45%', 'radius' => '1rem',
            ],
        ],
        'taro' => [
            'label' => 'Taro (purple)',
            'tokens' => [
                'primary' => '272 40% 42%', 'primary-foreground' => '280 40% 98%',
                'accent' => '322 75% 60%', 'accent-foreground' => '280 40% 12%',
                'background' => '285 33% 98%', 'foreground' => '275 25% 16%',
                'card' => '0 0% 100%', 'muted' => '285 25% 93%', 'muted-foreground' => '275 12% 44%',
                'border' => '285 20% 88%', 'ring' => '322 75% 60%', 'radius' => '1rem',
            ],
        ],
        'berry' => [
            'label' => 'Berry (pink/red)',
            'tokens' => [
                'primary' => '345 65% 42%', 'primary-foreground' => '350 40% 98%',
                'accent' => '15 90% 55%', 'accent-foreground' => '350 40% 12%',
                'background' => '350 40% 98%', 'foreground' => '345 30% 16%',
                'card' => '0 0% 100%', 'muted' => '350 30% 94%', 'muted-foreground' => '345 14% 44%',
                'border' => '350 24% 89%', 'ring' => '15 90% 55%', 'radius' => '1rem',
            ],
        ],
        'ocean' => [
            'label' => 'Ocean (teal)',
            'tokens' => [
                'primary' => '196 70% 34%', 'primary-foreground' => '196 40% 98%',
                'accent' => '174 72% 40%', 'accent-foreground' => '196 40% 12%',
                'background' => '196 40% 98%', 'foreground' => '200 30% 16%',
                'card' => '0 0% 100%', 'muted' => '196 30% 93%', 'muted-foreground' => '200 12% 42%',
                'border' => '196 24% 88%', 'ring' => '174 72% 40%', 'radius' => '1rem',
            ],
        ],
    ],

    // Management portal — calmer, data-dense, dark-mode aware.
    'admin' => [
        'moss' => [
            'label' => 'Moss (natural cafe)',
            'tokens' => [
                'primary' => '96 22% 32%', 'primary-foreground' => '80 30% 97%',
                'accent' => '18 52% 52%', 'accent-foreground' => '30 40% 98%',
                'background' => '40 30% 97%', 'foreground' => '30 16% 18%',
                'card' => '0 0% 100%', 'muted' => '40 24% 92%', 'muted-foreground' => '30 10% 42%',
                'border' => '38 20% 86%', 'ring' => '18 52% 52%', 'radius' => '0.9rem',
            ],
        ],
        'slate' => [
            'label' => 'Slate',
            'tokens' => [
                'primary' => '222 47% 40%', 'primary-foreground' => '210 40% 98%',
                'accent' => '221 83% 53%', 'accent-foreground' => '210 40% 98%',
                'background' => '210 40% 98%', 'foreground' => '222 47% 11%',
                'card' => '0 0% 100%', 'muted' => '210 40% 94%', 'muted-foreground' => '215 16% 42%',
                'border' => '214 20% 88%', 'ring' => '221 83% 53%', 'radius' => '0.65rem',
            ],
        ],
        'espresso' => [
            'label' => 'Espresso (warm brown)',
            'tokens' => [
                'primary' => '25 65% 31%', 'primary-foreground' => '36 33% 97%',
                'accent' => '32 95% 44%', 'accent-foreground' => '25 40% 15%',
                'background' => '36 30% 98%', 'foreground' => '25 25% 15%',
                'card' => '0 0% 100%', 'muted' => '36 20% 93%', 'muted-foreground' => '25 12% 42%',
                'border' => '30 18% 87%', 'ring' => '32 95% 44%', 'radius' => '0.65rem',
            ],
        ],
        'emerald' => [
            'label' => 'Emerald (green)',
            'tokens' => [
                'primary' => '158 64% 30%', 'primary-foreground' => '150 40% 98%',
                'accent' => '160 84% 39%', 'accent-foreground' => '150 40% 98%',
                'background' => '150 30% 98%', 'foreground' => '160 30% 12%',
                'card' => '0 0% 100%', 'muted' => '150 25% 93%', 'muted-foreground' => '160 12% 40%',
                'border' => '150 20% 87%', 'ring' => '160 84% 39%', 'radius' => '0.65rem',
            ],
        ],
        'violet' => [
            'label' => 'Violet (purple)',
            'tokens' => [
                'primary' => '262 52% 47%', 'primary-foreground' => '270 40% 98%',
                'accent' => '258 90% 66%', 'accent-foreground' => '270 40% 98%',
                'background' => '270 30% 98%', 'foreground' => '265 30% 14%',
                'card' => '0 0% 100%', 'muted' => '270 24% 94%', 'muted-foreground' => '265 12% 44%',
                'border' => '270 20% 89%', 'ring' => '258 90% 66%', 'radius' => '0.65rem',
            ],
        ],
        'graphite' => [
            'label' => 'Graphite (neutral)',
            'tokens' => [
                'primary' => '220 9% 25%', 'primary-foreground' => '0 0% 98%',
                'accent' => '199 89% 48%', 'accent-foreground' => '0 0% 98%',
                'background' => '0 0% 98%', 'foreground' => '220 9% 15%',
                'card' => '0 0% 100%', 'muted' => '220 10% 93%', 'muted-foreground' => '220 6% 42%',
                'border' => '220 10% 87%', 'ring' => '199 89% 48%', 'radius' => '0.65rem',
            ],
        ],
    ],
];
