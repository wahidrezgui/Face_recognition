<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use RuntimeException;

class EmployeePhotoSupport
{
    public static function storeUploadedPhoto(UploadedFile $photo): string
    {
        $extension = strtolower($photo->getClientOriginalExtension() ?: 'jpg');
        $filename = time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
        $directory = public_path('uploads');

        if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
            throw new RuntimeException('Unable to create uploads directory.');
        }

        $photo->move($directory, $filename);

        return 'uploads/' . $filename;
    }
}
