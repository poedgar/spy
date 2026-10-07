<?php

use App\Models\User;
use App\Support\CodenameGenerator;

test('generated codenames match the codename format', function () {
    foreach (range(1, 50) as $attempt) {
        expect(CodenameGenerator::random())->toMatch(CodenameGenerator::PATTERN);
    }
});

test('a unique codename is never one already taken', function () {
    $taken = User::factory()->count(5)->create()->pluck('codename');

    expect($taken)->not->toContain(CodenameGenerator::unique());
});

test('typed codenames are normalized to the stored form', function () {
    expect(CodenameGenerator::normalize('  night owl '))->toBe('NIGHT_OWL');
});
