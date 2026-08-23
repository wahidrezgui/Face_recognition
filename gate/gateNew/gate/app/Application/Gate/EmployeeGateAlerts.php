<?php

namespace App\Application\Gate;

use Illuminate\Support\Carbon;

/**
 * Classifies an employee's badge-expiry/remarks state for the gate kiosk card. Returns
 * structured {type, severity, ...context} rather than legacy's hardcoded Arabic sentences,
 * matching this app's i18n convention — the frontend renders the message via
 * trans('gate.alerts.<type>', context).
 */
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
     * @return list<array{type: string, severity: string, expiry_date?: string, remarks?: string}>
     */
    public static function classify(?string $expiryDate, ?string $remarks, int $warningDays = 30): array
    {
        $alerts = self::expiryAlerts($expiryDate, $warningDays);

        $text = trim((string) $remarks);
        if ($text !== '') {
            $alerts[] = ['type' => 'remark', 'severity' => 'info', 'remarks' => $text];
        }

        return $alerts;
    }

    /**
     * @return list<array{type: string, severity: string, expiry_date: string}>
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
            return [['type' => 'expired', 'severity' => 'danger', 'expiry_date' => $formatted]];
        }

        if ($expiry->lte($today->copy()->addDays($warningDays))) {
            return [['type' => 'expiring_soon', 'severity' => 'warning', 'expiry_date' => $formatted]];
        }

        return [];
    }
}
