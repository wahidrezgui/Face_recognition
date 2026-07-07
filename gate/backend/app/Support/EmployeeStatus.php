<?php

namespace App\Support;

class EmployeeStatus
{
    public const WORKFLOW = [
        0 => [
            'key' => 'pending',
            'label_en' => 'Pending',
            'label_ar' => 'معلّق',
            'log' => 'PENDING',
        ],
        1 => [
            'key' => 'approved',
            'label_en' => 'Approved',
            'label_ar' => 'معتمد',
            'log' => 'APPROVED',
        ],
        2 => [
            'key' => 'printed',
            'label_en' => 'Printed',
            'label_ar' => 'مطبوع',
            'log' => 'PRINTED',
        ],
        3 => [
            'key' => 'collected',
            'label_en' => 'Collected',
            'label_ar' => 'تم الاستلام',
            'log' => 'COLLECTED',
        ],
        4 => [
            'key' => 'canceled',
            'label_en' => 'Canceled',
            'label_ar' => 'ملغى',
            'log' => 'CANCELED',
        ],
    ];

    /** Status ids shown as filter cards on the employee list page. */
    public static function cardStatusIds(): array
    {
        return [0, 1, 2, 3];
    }

    public static function labelEn(int $status): string
    {
        return self::WORKFLOW[$status]['label_en'] ?? 'unknown';
    }

    public static function labelAr(int $status): string
    {
        return self::WORKFLOW[$status]['label_ar'] ?? 'unknown';
    }

    public static function logLabel(int $status): string
    {
        return self::WORKFLOW[$status]['log'] ?? 'UNKNOWN';
    }
}
