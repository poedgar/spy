<?php

use App\Models\Prompt;
use App\Models\User;

test('only administrators manage beginnings', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.prompts.index'))->assertForbidden();
    $this->post(route('admin.prompts.store'), ['language' => 'en', 'text' => 'Once upon a time…'])->assertForbidden();
});

test('the game starts with beginnings in both languages', function () {
    expect(Prompt::where('language', 'en')->count())->toBeGreaterThan(20)
        ->and(Prompt::where('language', 'uk')->count())->toBeGreaterThan(20);
});

test('admins add, edit, filter and remove beginnings', function () {
    $this->actingAs(User::factory()->create(['is_admin' => true]));

    $this->post(route('admin.prompts.store'), ['language' => 'en', 'text' => '  Once upon a time…  '])->assertSessionHasNoErrors();
    $prompt = Prompt::where('text', 'Once upon a time…')->sole();

    $this->post(route('admin.prompts.store'), ['language' => 'en', 'text' => 'once upon a time…'])->assertSessionHasErrors('text');
    $this->post(route('admin.prompts.store'), ['language' => 'uk', 'text' => 'Once upon a time…'])->assertSessionHasNoErrors();
    $this->post(route('admin.prompts.store'), ['language' => 'de', 'text' => 'Es war einmal…'])->assertSessionHasErrors('language');

    $this->get(route('admin.prompts.index', ['q' => 'upon', 'language' => 'en']))->assertInertia(fn ($page) => $page
        ->component('admin/Prompts')
        ->has('prompts.data', 1)
        ->where('prompts.data.0.text', 'Once upon a time…'));

    $this->put(route('admin.prompts.update', $prompt), ['language' => 'en', 'text' => 'Long, long ago…'])->assertSessionHasNoErrors();
    expect($prompt->fresh()->text)->toBe('Long, long ago…');

    $this->delete(route('admin.prompts.destroy', $prompt))->assertRedirect();
    expect(Prompt::find($prompt->id))->toBeNull()->and(Prompt::withTrashed()->find($prompt->id))->not->toBeNull();
});
