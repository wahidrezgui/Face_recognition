<?php

namespace App\Application\Personnel;

use App\Domain\Personnel\Models\Badge;
use App\Domain\Personnel\Models\Badge2;

class BadgeDesignerService
{
    /**
     * A saved template built by this designer always carries `data-badge-el` markers on
     * every element wrapper. Content that predates the designer (or was hand-edited)
     * won't have any — that's how we tell "editable" apart from "render-only" without a
     * separate flag column.
     */
    private const DESIGNER_MARKER = 'data-badge-el';

    public function loadForDepartment(int $depId): array
    {
        $front = Badge::where('dep_id', $depId)->first();
        $back = Badge2::where('dep_id', $depId)->first();

        return [
            'front' => $front ? $this->normalizeSide($front->content, (int) $front->width, (int) $front->heigth) : null,
            'back' => $back ? $this->normalizeSide($back->content, (int) $back->width, (int) $back->height) : null,
        ];
    }

    public function saveSide(int $depId, string $side, array $data, bool $applyToChildren, DepartmentTreeService $departmentTree): array
    {
        $attributes = [
            'content' => $data['content'] ?? '',
            'width' => $data['width'],
            $side === 'front' ? 'heigth' : 'height' => $data['height'],
        ];

        $model = $side === 'front' ? Badge::class : Badge2::class;
        $saved = $model::updateOrCreate(['dep_id' => $depId], $attributes);

        if ($applyToChildren) {
            foreach ($departmentTree->getAllChildrenDepartmentIds($depId) as $childId) {
                $model::updateOrCreate(['dep_id' => $childId], $attributes);
            }
        }

        $savedHeight = $side === 'front' ? $saved->heigth : $saved->height;

        return $this->normalizeSide($saved->content, (int) $saved->width, (int) $savedHeight);
    }

    /**
     * Employee-independent token registry — the single source of truth for what
     * `{{token}}` names exist, used to populate the designer's token picker. Kept in sync
     * by hand with `AccessCardService::textValues()` (plain tokens) and
     * `accessCardRender.ts` (markup tokens: qrcode/photos/zones).
     */
    public function tokenKeys(): array
    {
        $text = [
            ['key' => 'fullname_ar', 'label_ar' => 'الاسم بالعربية', 'label_en' => 'Full name (AR)'],
            ['key' => 'fullname_en', 'label_ar' => 'الاسم بالإنجليزية', 'label_en' => 'Full name (EN)'],
            ['key' => 'Job_Arabic', 'label_ar' => 'الوظيفة بالعربية', 'label_en' => 'Job (AR)'],
            ['key' => 'Job_En', 'label_ar' => 'الوظيفة بالإنجليزية', 'label_en' => 'Job (EN)'],
            ['key' => 'military_number', 'label_ar' => 'الرقم العسكري', 'label_en' => 'Military number'],
            ['key' => 'bloodtype', 'label_ar' => 'فصيلة الدم', 'label_en' => 'Blood type'],
            ['key' => 'expiry_date', 'label_ar' => 'تاريخ الانتهاء', 'label_en' => 'Expiry date'],
            ['key' => 'remarks', 'label_ar' => 'ملاحظات', 'label_en' => 'Remarks'],
            ['key' => 'Escort', 'label_ar' => 'المرافقة', 'label_en' => 'Escort'],
            ['key' => 'device', 'label_ar' => 'الجهاز', 'label_en' => 'Device'],
            ['key' => 'StartTime', 'label_ar' => 'وقت البدء', 'label_en' => 'Start time'],
            ['key' => 'EndTime', 'label_ar' => 'وقت الانتهاء', 'label_en' => 'End time'],
            ['key' => 'rank', 'label_ar' => 'الرتبة بالعربية', 'label_en' => 'Rank (AR)'],
            ['key' => 'ranke', 'label_ar' => 'الرتبة بالإنجليزية', 'label_en' => 'Rank (EN)'],
            ['key' => 'department', 'label_ar' => 'الوحدة الرئيسية', 'label_en' => 'Parent department'],
            ['key' => 'dep_name', 'label_ar' => 'اسم الوحدة بالعربية', 'label_en' => 'Department (AR)'],
            ['key' => 'dep3', 'label_ar' => 'اسم الوحدة بالإنجليزية', 'label_en' => 'Department (EN)'],
            ['key' => 'default_base', 'label_ar' => 'القاعدة الافتراضية', 'label_en' => 'Default base'],
            ['key' => 'selected_base', 'label_ar' => 'القاعدة المختارة', 'label_en' => 'Selected base'],
            ['key' => 'nationality', 'label_ar' => 'الجنسية بالعربية', 'label_en' => 'Nationality (AR)'],
            ['key' => 'nationalitye', 'label_ar' => 'الجنسية بالإنجليزية', 'label_en' => 'Nationality (EN)'],
            ['key' => 'plate_numbers', 'label_ar' => 'أرقام اللوحات والوصف', 'label_en' => 'Plate numbers & description'],
            ['key' => 'idguest', 'label_ar' => 'رقم الموظف', 'label_en' => 'Employee ID'],
        ];

        $image = [
            ['key' => 'qrcode', 'label_ar' => 'رمز الاستجابة السريعة', 'label_en' => 'QR code'],
            ['key' => 'guest_photo_circle', 'label_ar' => 'الصورة (دائرية)', 'label_en' => 'Photo (circle)'],
            ['key' => 'guest_photo_square', 'label_ar' => 'الصورة (مربعة)', 'label_en' => 'Photo (square)'],
            ['key' => 'guest_photo_circleb', 'label_ar' => 'صورة القاعدة (دائرية)', 'label_en' => 'Base photo (circle)'],
            ['key' => 'guest_photo_squareb', 'label_ar' => 'صورة القاعدة (مربعة)', 'label_en' => 'Base photo (square)'],
        ];

        $special = [
            ['key' => 'zones', 'label_ar' => 'المناطق', 'label_en' => 'Zones'],
        ];

        return [
            ...array_map(fn (array $t) => [...$t, 'group' => 'text'], $text),
            ...array_map(fn (array $t) => [...$t, 'group' => 'image'], $image),
            ...array_map(fn (array $t) => [...$t, 'group' => 'special'], $special),
        ];
    }

    private function normalizeSide(string $content, int $width, int $height): array
    {
        return [
            'content' => $content,
            'width' => $width,
            'height' => $height,
            'format' => $this->detectFormat($content),
        ];
    }

    private function detectFormat(string $content): string
    {
        if (trim($content) === '') {
            return 'empty';
        }

        return str_contains($content, self::DESIGNER_MARKER) ? 'designer' : 'raw';
    }
}
