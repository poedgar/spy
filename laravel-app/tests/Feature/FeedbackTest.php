<?php

use App\Models\Feedback;
use App\Models\User;

test('guests send an idea from the home page, with an address for a reply', function () {
    $this->get('/')->assertOk();

    $this->from('/')->post(route('feedback.store'), [
        'kind' => 'idea',
        'message' => 'A drawing game, please!',
        'email' => 'guest@example.com',
    ], ['User-Agent' => 'TestBrowser/1.0'])->assertRedirect('/')->assertSessionHasNoErrors();

    $item = Feedback::sole();
    expect($item->kind)->toBe('idea')->and($item->message)->toBe('A drawing game, please!')
        ->and($item->email)->toBe('guest@example.com')->and($item->user_id)->toBeNull()
        ->and($item->user_agent)->toBe('TestBrowser/1.0');
});

test('players report bugs under their own account', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('feedback.store'), [
        'kind' => 'bug',
        'message' => 'The timer froze at 0:03.',
        'email' => 'ignored@example.com',
    ])->assertSessionHasNoErrors();

    expect(Feedback::sole())->user_id->toBe($user->id)->email->toBeNull();
});

test('feedback needs a kind and a real message, and bots are turned away', function () {
    $this->post(route('feedback.store'), ['kind' => 'rant', 'message' => 'Hello there'])->assertSessionHasErrors('kind');
    $this->post(route('feedback.store'), ['kind' => 'idea', 'message' => 'hi'])->assertSessionHasErrors('message');
    $this->post(route('feedback.store'), ['kind' => 'idea', 'message' => 'Hello there', 'email' => 'nope'])->assertSessionHasErrors('email');
    $this->post(route('feedback.store'), ['kind' => 'idea', 'message' => 'Buy cheap stuff', 'website' => 'spam.example'])->assertSessionHasErrors('website');

    expect(Feedback::count())->toBe(0);
});

test('one visitor can only send a few messages at a time', function () {
    foreach (range(1, 5) as $n) {
        $this->post(route('feedback.store'), ['kind' => 'idea', 'message' => "Idea number {$n}"])->assertSessionHasNoErrors();
    }

    $this->post(route('feedback.store'), ['kind' => 'idea', 'message' => 'One more idea'])->assertSessionHasErrors('message');
    expect(Feedback::count())->toBe(5);
});

test('only administrators read feedback', function () {
    $item = Feedback::create(['kind' => 'bug', 'message' => 'Broken button']);
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.feedback.index'))->assertForbidden();
    $this->put(route('admin.feedback.update', $item), ['resolved' => true])->assertForbidden();
    $this->delete(route('admin.feedback.destroy', $item))->assertForbidden();
});

test('admins read, filter, mark done and remove feedback', function () {
    $player = User::factory()->create(['email' => 'player@example.com']);
    $bug = Feedback::create(['kind' => 'bug', 'message' => 'Broken button', 'user_id' => $player->id]);
    $idea = Feedback::create(['kind' => 'idea', 'message' => 'More songs', 'email' => 'guest@example.com']);
    $this->actingAs(User::factory()->create(['is_admin' => true]));

    $this->get(route('admin.feedback.index'))->assertInertia(fn ($page) => $page
        ->component('admin/Feedback')
        ->has('feedback.data', 2)
        ->where('feedback.data.0.message', 'More songs')
        ->where('feedback.data.0.email', 'guest@example.com')
        ->where('feedback.data.1.user.codename', $player->codename)
        ->where('feedback.data.1.email', 'player@example.com')
        ->where('stats.open', 2)
        ->where('stats.bugs', 1));

    $this->put(route('admin.feedback.update', $bug), ['resolved' => true])->assertRedirect();
    expect($bug->fresh()->resolved_at)->not->toBeNull();

    $this->get(route('admin.feedback.index', ['status' => 'open']))->assertInertia(fn ($page) => $page
        ->has('feedback.data', 1)->where('feedback.data.0.id', $idea->id)->where('stats.open', 1));
    $this->get(route('admin.feedback.index', ['kind' => 'bug']))->assertInertia(fn ($page) => $page
        ->has('feedback.data', 1)->where('feedback.data.0.resolved', true));

    $this->put(route('admin.feedback.update', $bug), ['resolved' => false]);
    expect($bug->fresh()->resolved_at)->toBeNull();

    $this->delete(route('admin.feedback.destroy', $idea))->assertRedirect();
    expect(Feedback::count())->toBe(1);
});
