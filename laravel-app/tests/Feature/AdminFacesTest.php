<?php

use App\Models\Face;
use App\Models\User;

beforeEach(fn () => Face::query()->delete());

test('only administrators see the faces', function () {
    $face = face();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.faces.index'))->assertForbidden();
    $this->put(route('admin.faces.update', $face), ['active' => false])->assertForbidden();
});

test('admins see how recognisable each face is, filter by level, and switch faces off', function () {
    $this->actingAs(User::factory()->create(['is_admin' => true]));
    $hard = face('fear', 1, ['shown_count' => 30, 'correct_count' => 9]);
    face('joy', 1);

    $this->get(route('admin.faces.index', ['sort' => 'hardest']))->assertInertia(fn ($page) => $page
        ->component('admin/Faces')
        ->where('faces.data.0.id', $hard->id)
        ->where('faces.data.0.hit_rate', 0.3)
        ->where('faces.data.0.level', 3)
        ->where('faces.data.0.measured', true)
        ->where('stats.measured', 1)
        ->where('stats.answers', 30));

    $this->get(route('admin.faces.index', ['level' => 3]))->assertInertia(fn ($page) => $page->has('faces.data', 1));

    $this->put(route('admin.faces.update', $hard), ['active' => false])->assertRedirect();
    expect($hard->fresh()->active)->toBeFalse();
});
