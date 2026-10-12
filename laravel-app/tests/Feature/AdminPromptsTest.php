<?php

use App\Models\Prompt;
use App\Models\User;

test('only administrators manage beginnings', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.prompts.index'))->assertForbidden();
    $this->post(route('admin.prompts.store'), ['game' => 'finish', 'language' => 'en', 'text' => 'Once upon a time…'])->assertForbidden();
});

test('both written games start with phrases in both languages', function (string $game) {
    expect(Prompt::where('game_type', $game)->where('language', 'en')->count())->toBeGreaterThan(20)
        ->and(Prompt::where('game_type', $game)->where('language', 'uk')->count())->toBeGreaterThan(20);
})->with(['finish', 'meaning']);

test('idioms keep their real meaning; beginnings never have one', function () {
    $this->actingAs(User::factory()->create(['is_admin' => true]));

    $this->post(route('admin.prompts.store'), ['game' => 'meaning', 'language' => 'en', 'text' => 'Hit the road', 'meaning' => ' To leave. '])->assertSessionHasNoErrors();
    $this->post(route('admin.prompts.store'), ['game' => 'finish', 'language' => 'en', 'text' => 'Hit the road…', 'meaning' => 'ignored'])->assertSessionHasNoErrors();
    // The same text may be in both games.
    $this->post(route('admin.prompts.store'), ['game' => 'finish', 'language' => 'en', 'text' => 'Hit the road'])->assertSessionHasNoErrors();
    $this->post(route('admin.prompts.store'), ['game' => 'spy', 'language' => 'en', 'text' => 'Nope'])->assertSessionHasErrors('game');

    expect(Prompt::where('game_type', 'meaning')->where('text', 'Hit the road')->sole()->meaning)->toBe('To leave.')
        ->and(Prompt::where('text', 'Hit the road…')->sole()->meaning)->toBeNull();

    $this->get(route('admin.prompts.index', ['game' => 'meaning', 'q' => 'to leave']))->assertInertia(fn ($page) => $page
        ->has('prompts.data', 1)
        ->where('prompts.data.0.text', 'Hit the road')
        ->where('prompts.data.0.meaning', 'To leave.')
        ->where('counts.meaning.en', fn ($count) => $count > 20));
});

test('admins add, edit, filter and remove beginnings', function () {
    $this->actingAs(User::factory()->create(['is_admin' => true]));

    $this->post(route('admin.prompts.store'), ['game' => 'finish', 'language' => 'en', 'text' => '  Once upon a time…  '])->assertSessionHasNoErrors();
    $prompt = Prompt::where('text', 'Once upon a time…')->sole();

    $this->post(route('admin.prompts.store'), ['game' => 'finish', 'language' => 'en', 'text' => 'once upon a time…'])->assertSessionHasErrors('text');
    $this->post(route('admin.prompts.store'), ['game' => 'finish', 'language' => 'uk', 'text' => 'Once upon a time…'])->assertSessionHasNoErrors();
    $this->post(route('admin.prompts.store'), ['game' => 'finish', 'language' => 'de', 'text' => 'Es war einmal…'])->assertSessionHasErrors('language');

    $this->get(route('admin.prompts.index', ['q' => 'upon', 'language' => 'en']))->assertInertia(fn ($page) => $page
        ->component('admin/Prompts')
        ->has('prompts.data', 1)
        ->where('prompts.data.0.text', 'Once upon a time…'));

    $this->put(route('admin.prompts.update', $prompt), ['game' => 'finish', 'language' => 'en', 'text' => 'Long, long ago…'])->assertSessionHasNoErrors();
    expect($prompt->fresh()->text)->toBe('Long, long ago…');

    $this->delete(route('admin.prompts.destroy', $prompt))->assertRedirect();
    expect(Prompt::find($prompt->id))->toBeNull()->and(Prompt::withTrashed()->find($prompt->id))->not->toBeNull();
});
