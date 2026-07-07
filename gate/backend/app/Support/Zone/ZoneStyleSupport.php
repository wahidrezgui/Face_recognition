<?php

namespace App\Support\Zone;

use App\Models\Zones;
use Illuminate\Validation\ValidationException;

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

    /**
     * @return array<string, mixed>
     */
    public static function validatePayload(array $input, bool $requireId = false): array
    {
        $rules = [
            'name_en' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'base_id' => 'required|integer|exists:bases,id',
            'color' => 'required|string|max:32',
            'pattern_type' => 'nullable|string|in:none,line,cross',
            'pattern_color' => 'nullable|string|max:32',
        ];

        if ($requireId) {
            $rules['id'] = 'required|integer|exists:zones,id';
        }

        $validated = validator($input, $rules)->validate();

        $patternType = $validated['pattern_type'] ?? self::PATTERN_NONE;

        if (in_array($patternType, [self::PATTERN_LINE, self::PATTERN_CROSS], true)
            && empty($validated['pattern_color'])) {
            throw ValidationException::withMessages([
                'pattern_color' => ['لون الخط مطلوب عند اختيار نمط خط أو تقاطع.'],
            ]);
        }

        $validated['pattern_type'] = $patternType;
        $validated['color'] = self::normalizeColor($validated['color']);

        if ($patternType === self::PATTERN_NONE) {
            $validated['pattern_color'] = null;
        } elseif (! empty($validated['pattern_color'])) {
            $validated['pattern_color'] = self::normalizeColor($validated['pattern_color']);
        }

        return $validated;
    }

    public static function normalizeColor(string $color): string
    {
        $trimmed = trim($color);

        if ($trimmed === '') {
            return '#3B82F6';
        }

        $named = self::namedColorMap();

        if (isset($named[strtolower($trimmed)])) {
            return $named[strtolower($trimmed)];
        }

        if (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $trimmed) === 1) {
            if (strlen($trimmed) === 4) {
                return sprintf(
                    '#%s%s%s%s%s%s',
                    $trimmed[1],
                    $trimmed[1],
                    $trimmed[2],
                    $trimmed[2],
                    $trimmed[3],
                    $trimmed[3],
                );
            }

            return strtoupper($trimmed);
        }

        if (preg_match('/^[0-9a-fA-F]{6}$/', $trimmed) === 1) {
            return '#'.strtoupper($trimmed);
        }

        return $trimmed;
    }

    /**
     * @return array<string, string|null>
     */
    public static function colorPayload(Zones $zone): array
    {
        $patternType = $zone->pattern_type ?: self::PATTERN_NONE;

        if (! in_array($patternType, self::PATTERN_TYPES, true)) {
            $patternType = self::PATTERN_NONE;
        }

        return [
            'color' => self::normalizeColor((string) $zone->color),
            'pattern_type' => $patternType,
            'pattern_color' => $patternType === self::PATTERN_NONE
                ? null
                : self::normalizeColor((string) ($zone->pattern_color ?: '#FFFFFF')),
        ];
    }

    /**
     * @return array<string, string>
     */
    private static function namedColorMap(): array
    {
        return [
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
    }
}
