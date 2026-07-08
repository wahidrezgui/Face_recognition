<?php

namespace Tests\Unit;

use App\Support\EmployeePhotoSupport;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class EmployeePhotoSupportTest extends TestCase
{
    public function test_store_uploaded_photo_writes_to_public_uploads(): void
    {
        $uploadsDir = public_path('uploads');
        if (! is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0755, true);
        }

        $file = UploadedFile::fake()->create('employee.jpg', 8, 'image/jpeg');
        $storedPath = EmployeePhotoSupport::storeUploadedPhoto($file);

        $this->assertStringStartsWith('uploads/', $storedPath);
        $this->assertFileExists(public_path($storedPath));

        @unlink(public_path($storedPath));
    }
}
