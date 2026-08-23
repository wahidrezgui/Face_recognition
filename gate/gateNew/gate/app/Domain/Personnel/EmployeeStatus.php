<?php

namespace App\Domain\Personnel;

enum EmployeeStatus: int
{
    case Pending = 0;
    case Approved = 1;
    case Printed = 2;
    case Collected = 3;
    case Canceled = 4;

    public function labelAr(): string
    {
        return match ($this) {
            self::Pending => 'معلّق',
            self::Approved => 'معتمد',
            self::Printed => 'مطبوع',
            self::Collected => 'تم الاستلام',
            self::Canceled => 'ملغي',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Approved => 'Approved',
            self::Printed => 'Printed',
            self::Collected => 'Collected',
            self::Canceled => 'Canceled',
        };
    }

    public function logLabel(): string
    {
        return strtoupper($this->labelEn());
    }
}
