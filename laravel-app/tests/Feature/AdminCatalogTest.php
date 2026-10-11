<?php

use App\Enums\AgeTier;
use App\Enums\Locale;
use App\Models\Location;
use App\Models\Phrase;
use App\Models\User;
use App\Support\LocationCatalog;
use App\Support\PhraseCatalog;
use Laravel\Sanctum\Sanctum;

beforeEach(fn () => $this->admin = User::factory()->create(['is_admin' => true]));

test('only administrators can see or change locations and phrases', function () {
    $location = Location::first();
    $phrase = Phrase::first();
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.locations.index'))->assertForbidden();
    $this->get(route('admin.phrases.index'))->assertForbidden();
    $this->post(route('admin.locations.store'), ['en' => 'X', 'uk' => 'X', 'category' => 'academic', 'tier' => 'adults'])->assertForbidden();
    $this->delete(route('admin.locations.destroy', $location))->assertForbidden();
    $this->put(route('admin.phrases.update', $phrase), ['language' => 'en', 'text' => 'one two three'])->assertForbidden();
});

test('the shipped locations and phrases are in the database with their ids', function () {
    expect(Location::count())->toBe(502)
        ->and(LocationCatalog::find(1)['en'])->toBe('Church')
        ->and(PhraseCatalog::find(Locale::English, 1)['text'])->toBe('Actions speak louder than words');

    $this->actingAs($this->admin)->get(route('admin.locations.index', ['q' => 'church']))
        ->assertInertia(fn ($page) => $page->component('admin/Locations')->where('locations.data.0.en', 'Church'));
});

test('admins add, edit and remove locations; removed ones leave new rounds but keep their history', function () {
    $this->actingAs($this->admin);

    $this->post(route('admin.locations.store'), ['en' => 'Orbital Lighthouse', 'uk' => 'Орбітальний маяк', 'category' => 'transit', 'tier' => 'children'])
        ->assertRedirect();
    $location = Location::where('en', 'Orbital Lighthouse')->sole();
    expect($location->id)->toBeGreaterThan(502)
        ->and(collect(LocationCatalog::forTier(AgeTier::Children))->pluck('id'))->toContain($location->id);

    $this->put(route('admin.locations.update', $location), ['en' => 'Old Lighthouse', 'uk' => 'Старий маяк', 'category' => 'transit', 'tier' => 'teens'])
        ->assertRedirect();
    expect(LocationCatalog::find($location->id)['en'])->toBe('Old Lighthouse')
        ->and(collect(LocationCatalog::forTier(AgeTier::Children))->pluck('id'))->not->toContain($location->id);

    $this->delete(route('admin.locations.destroy', $location))->assertRedirect();
    expect(LocationCatalog::find($location->id))->toBeNull()
        ->and(LocationCatalog::present($location->id)['en'])->toBe('Old Lighthouse');
});

test('locations need both names, a known category and an age tier', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.locations.store'), ['en' => '', 'uk' => 'Орбітальний маяк', 'category' => 'moon', 'tier' => 'toddlers'])
        ->assertSessionHasErrors(['en', 'category', 'tier']);
});

test('phrases need enough words and must not repeat in their language', function () {
    $this->actingAs($this->admin);

    $this->post(route('admin.phrases.store'), ['language' => 'en', 'text' => 'Too short'])->assertSessionHasErrors('text');
    $this->post(route('admin.phrases.store'), ['language' => 'en', 'text' => 'actions SPEAK louder than words!'])->assertSessionHasErrors('text');
    $this->post(route('admin.phrases.store'), ['language' => 'en', 'text' => 'Fortune favours the bold'])->assertSessionHasNoErrors();

    $added = Phrase::where('text', 'Fortune favours the bold')->sole();
    expect($added->number)->toBe((int) Phrase::where('language', 'en')->max('number'))
        ->and(collect(PhraseCatalog::all(Locale::English))->pluck('text'))->toContain('Fortune favours the bold');
});

test('removing a phrase stops new deals but old rounds still find it', function () {
    $phrase = Phrase::where('language', 'en')->where('number', 1)->sole();

    $this->actingAs($this->admin)->delete(route('admin.phrases.destroy', $phrase))->assertRedirect();

    expect(collect(PhraseCatalog::all(Locale::English))->pluck('id'))->not->toContain(1)
        ->and(PhraseCatalog::find(Locale::English, 1)['text'])->toBe('Actions speak louder than words');
});

test('a round keeps the phrase it was dealt even if an admin edits it mid-game', function () {
    [$game, $host, $players] = phraseGame(3);
    $round = dealPhrase($game, $host);
    $dealt = $round->text();
    $phrase = Phrase::where('language', $round->language->value)->where('number', $round->phrase_id)->sole();

    $this->actingAs($this->admin)->put(route('admin.phrases.update', $phrase), [
        'language' => $phrase->language,
        'text' => 'Something entirely different now',
    ])->assertSessionHasNoErrors();

    expect($round->fresh()->text())->toBe($dealt);

    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/phrase/guess", ['guess' => $dealt])
        ->assertOk()
        ->assertJsonPath('correct', true);
});
