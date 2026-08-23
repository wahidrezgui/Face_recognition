<?php

namespace App\Domain\Gate;

class ZoneStyleSupport
{
    public const PATTERN_NONE = 'none';

    public const PATTERN_LINE = 'line';

    public const PATTERN_CROSS = 'cross';

    public const PATTERN_TYPES = [
        self::PATTERN_NONE,
        self::PATTERN_LINE,
        self::PATTERN_CROSS,
    ];

    private const NAMED_COLORS = [
        'green' => '#008000',
        'red' => '#FF0000',
        'blue' => '#0000FF',
        'yellow' => '#FFFF00',
        'white' => '#FFFFFF',
        'black' => '#000000',
        'orange' => '#FFA500',
        'purple' => '#800080',
        'gray' => '#808080',
        'grey' => '#808080',
    ];

    public static function normalizeColor(string $color): string
    {
        $trimmed = trim($color);

        if ($trimmed === '') {
            return '#3B82F6';
        }

        if (isset(self::NAMED_COLORS[strtolower($trimmed)])) {
            return self::NAMED_COLORS[strtolower($trimmed)];
        }

        if (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $trimmed) === 1) {
            if (strlen($trimmed) === 4) {
                return sprintf('#%s%s%s%s%s%s', $trimmed[1], $trimmed[1], $trimmed[2], $trimmed[2], $trimmed[3], $trimmed[3]);
            }

            return strtoupper($trimmed);
        }

        if (preg_match('/^[0-9a-fA-F]{6}$/', $trimmed) === 1) {
            return '#'.strtoupper($trimmed);
        }

        return $trimmed;
    }

    /**
     * Normalizes the validated color/pattern fields in place: uppercases hex colors,
     * and nulls out pattern_color when pattern_type is 'none'.
     */
    public static function normalizePayload(array $validated): array
    {
        $patternType = $validated['pattern_type'] ?? self::PATTERN_NONE;
        $validated['pattern_type'] = $patternType;
        $validated['color'] = self::normalizeColor($validated['color']);

        if ($patternType === self::PATTERN_NONE) {
            $validated['pattern_color'] = null;
        } elseif (! empty($validated['pattern_color'])) {
            $validated['pattern_color'] = self::normalizeColor($validated['pattern_color']);
        }

        return $validated;
    }
}
