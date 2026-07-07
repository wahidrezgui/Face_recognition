<?php

namespace Tests\Unit;

use App\Models\Bases;
use App\Models\Zones;
use App\Support\Zone\ZoneStyleSupport;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ZoneStyleSupportTest extends TestCase
{
    public function test_it_normalizes_named_colors(): void
    {
        $this->assertSame('#008000', ZoneStyleSupport::normalizeColor('green'));
        $this->assertSame('#FFFF00', ZoneStyleSupport::normalizeColor('#ffff00'));
    }

    public function test_it_validates_zone_payload_with_pattern(): void
    {
        $baseId = Bases::query()->value('id');

        if (! $baseId) {
            $baseId = Bases::create([
                'name_en' => 'Test Base',
                'name_ar' => 'قاعدة',
                'base_photo' => '',
            ])->id;
        }

        $validated = ZoneStyleSupport::validatePayload([
            'name_en' => 'Operations',
            'name_ar' => 'عمليات',
            'base_id' => $baseId,
            'color' => '#FF0000',
            'pattern_type' => 'cross',
            'pattern_color' => 'yellow',
        ]);

        $this->assertSame('cross', $validated['pattern_type']);
        $this->assertSame('#FFFF00', $validated['pattern_color']);
        $this->assertSame('#FF0000', $validated['color']);
    }

    public function test_it_requires_pattern_color_when_pattern_is_set(): void
    {
        $baseId = Bases::query()->value('id');

        if (! $baseId) {
            $baseId = Bases::create([
                'name_en' => 'Test Base',
                'name_ar' => 'قاعدة',
                'base_photo' => '',
            ])->id;
        }

        $this->expectException(ValidationException::class);

        ZoneStyleSupport::validatePayload([
            'name_en' => 'Operations',
            'base_id' => $baseId,
            'color' => '#FF0000',
            'pattern_type' => 'line',
        ]);
    }

    public function test_it_clears_pattern_color_for_solid_zones(): void
    {
        $baseId = Bases::query()->value('id');

        if (! $baseId) {
            $baseId = Bases::create([
                'name_en' => 'Test Base',
                'name_ar' => 'قاعدة',
                'base_photo' => '',
            ])->id;
        }

        $validated = ZoneStyleSupport::validatePayload([
            'name_en' => 'Operations',
            'base_id' => $baseId,
            'color' => '#FF0000',
            'pattern_type' => 'none',
            'pattern_color' => '#FFFFFF',
        ]);

        $this->assertSame('none', $validated['pattern_type']);
        $this->assertNull($validated['pattern_color']);
    }

    public function test_it_builds_color_payload_from_zone_model(): void
    {
        $zone = new Zones([
            'color' => 'green',
            'pattern_type' => 'line',
            'pattern_color' => '#FFFF00',
        ]);

        $payload = ZoneStyleSupport::colorPayload($zone);

        $this->assertSame('#008000', $payload['color']);
        $this->assertSame('line', $payload['pattern_type']);
        $this->assertSame('#FFFF00', $payload['pattern_color']);
    }
}
