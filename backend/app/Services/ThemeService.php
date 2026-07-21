<?php

namespace App\Services;

/**
 * Resolves the color palette for a surface ("public" | "admin") into concrete
 * CSS-variable token values. Palette definitions live in config/palettes.php;
 * the chosen palette key is stored on the settings row.
 */
class ThemeService
{
    public const DEFAULTS = ['public' => 'espresso', 'admin' => 'moss'];

    /** All selectable palettes for a surface (for the settings picker). */
    public function palettes(string $surface): array
    {
        $palettes = config("palettes.$surface", []);

        return collect($palettes)
            ->map(fn ($def, $key) => [
                'key' => $key,
                'label' => $def['label'],
                'tokens' => $def['tokens'],
            ])
            ->values()
            ->all();
    }

    /**
     * Resolve a stored theme config into the payload the frontend applies:
     *   ['palette' => 'espresso', 'label' => '…', 'mode' => 'light', 'tokens' => [...]]
     */
    public function resolve(string $surface, ?array $stored): array
    {
        $default = self::DEFAULTS[$surface] ?? 'espresso';
        $key = $stored['palette'] ?? $default;

        $def = config("palettes.$surface.$key");
        if (! $def) {
            $key = $default;
            $def = config("palettes.$surface.$key");
        }

        return [
            'palette' => $key,
            'label' => $def['label'] ?? $key,
            // Only the admin surface supports dark mode.
            'mode' => $surface === 'admin' ? ($stored['mode'] ?? 'light') : 'light',
            'tokens' => $def['tokens'] ?? [],
        ];
    }

    public function isValidPalette(string $surface, string $key): bool
    {
        return config("palettes.$surface.$key") !== null;
    }
}
