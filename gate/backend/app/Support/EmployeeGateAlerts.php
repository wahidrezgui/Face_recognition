<?php

namespace App\Support;

use Carbon\Carbon;

class EmployeeGateAlerts
{
    public static function isExpired(?string $expiryDate): bool
    {
        if (! $expiryDate) {
            return false;
        }

        return Carbon::parse($expiryDate)->startOfDay()->lt(now()->startOfDay());
    }

    /**
     * @return list<array{type: string, severity: string, message: string}>
     */
    public static function build(?string $expiryDate, ?string $remarks, int $warningDays = 30): array
    {
        $alerts = self::expiryAlerts($expiryDate, $warningDays);

        return array_merge($alerts, self::remarkAlerts($remarks, $alerts));
    }

    /**
     * @return list<array{type: string, severity: string, message: string}>
     */
    private static function expiryAlerts(?string $expiryDate, int $warningDays): array
    {
        if (! $expiryDate) {
            return [];
        }

        $expiry = Carbon::parse($expiryDate)->startOfDay();
        $today = now()->startOfDay();
        $formatted = $expiry->format('Y-m-d');

        if ($expiry->lt($today)) {
            return [[
                'type' => 'expired',
                'severity' => 'danger',
                'message' => "بطاقة الدخول منتهية الصلاحية — تاريخ الانتهاء: {$formatted}",
            ]];
        }

        if ($expiry->lte($today->copy()->addDays($warningDays))) {
            return [[
                'type' => 'expiring_soon',
                'severity' => 'warning',
                'message' => "تأكد من صلاحية التصريح — تنتهي في {$formatted}",
            ]];
        }

        return [];
    }

    /**
     * @param  list<array{type: string, severity: string, message: string}>  $existing
     * @return list<array{type: string, severity: string, message: string}>
     */
    private static function remarkAlerts(?string $remarks, array $existing): array
    {
        $text = trim((string) $remarks);
        if ($text === '') {
            return [];
        }

        $hasExpiryAlert = collect($existing)->contains(
            fn (array $alert) => in_array($alert['type'], ['expired', 'expiring_soon'], true)
        );

        if ($hasExpiryAlert && (mb_strpos($text, 'صلاحية') !== false || mb_strpos($text, 'تصريح') !== false)) {
            return [];
        }

        return [[
            'type' => 'remark',
            'severity' => 'info',
            'message' => $text,
        ]];
    }
}
