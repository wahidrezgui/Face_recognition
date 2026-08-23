<?php

use App\Application\Gate\MovementService;
use Illuminate\Support\Carbon;
use Tests\TestCase;

uses(TestCase::class);

/**
 * @param  array<string, mixed>  $item
 * @return array{0: string, 1: string}
 */
function resolveMovementClock(array $item): array
{
    $method = new ReflectionMethod(MovementService::class, 'resolveMovementDateTime');

    return $method->invoke(app(MovementService::class), $item);
}

test('app timezone is Asia/Qatar', function () {
    expect(config('app.timezone'))->toBe('Asia/Qatar');
});

test('auto path stamps mvdate and mvtime in app timezone not utc', function () {
    $this->travelTo(Carbon::parse('2026-08-20T06:26:00Z'));

    [$mvdate, $mvtime] = resolveMovementClock([]);

    expect($mvdate)->toBe('2026-08-20')
        ->and($mvtime)->toBe('09:26:00');
});

test('queued_at utc iso converts to qatar local including date rollover', function () {
    [$mvdate, $mvtime] = resolveMovementClock([
        'queued_at' => '2026-08-19T21:30:00.000Z',
    ]);

    expect($mvdate)->toBe('2026-08-20')
        ->and($mvtime)->toBe('00:30:00');
});

test('explicit client mvdate and mvtime are kept as-is', function () {
    $this->travelTo(Carbon::parse('2026-08-20T06:26:00Z'));

    [$mvdate, $mvtime] = resolveMovementClock([
        'mvdate' => '2026-08-18',
        'mvtime' => '14:05',
        'queued_at' => '2026-08-19T21:30:00.000Z',
    ]);

    expect($mvdate)->toBe('2026-08-18')
        ->and($mvtime)->toBe('14:05');
});
