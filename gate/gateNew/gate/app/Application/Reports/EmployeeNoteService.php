<?php

namespace App\Application\Reports;

use App\Domain\Audit\Models\AppLog;
use App\Domain\Identity\Models\User;
use App\Domain\Personnel\Models\EmployeeNote;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class EmployeeNoteService
{
    /**
     * @param  array{emp_id: int, mvdate: string, notes: string}  $data
     */
    public function addNote(array $data, User $actor): EmployeeNote
    {
        return EmployeeNote::updateOrCreate(
            ['emp_id' => $data['emp_id'], 'mvdate' => $data['mvdate']],
            [
                'notes' => $data['notes'],
                'created_by_id' => $actor->id,
            ],
        );
    }

    public function deleteNote(int $empId, string $day, User $actor): void
    {
        $note = EmployeeNote::where('emp_id', $empId)->where('mvdate', $day)->first();

        if (! $note) {
            throw new HttpException(Response::HTTP_NOT_FOUND, 'Note not found');
        }

        $noteText = $note->notes;
        $note->delete();

        AppLog::create([
            'emp_id' => $empId,
            'task' => Str::limit("Deleted {$day} Note: \"{$noteText}\"", 255, ''),
            'created_by_id' => $actor->id,
            'ip_address' => request()->ip(),
        ]);
    }
}
