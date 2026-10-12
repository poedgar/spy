<?php

use App\Models\Song;
use App\Models\User;
use App\Support\YouTube;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

test('only administrators manage songs', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('admin.songs.index'))->assertForbidden();
    $this->post(route('admin.songs.store'), ['title' => 'X', 'link' => 'https://youtu.be/fJ9rUzIMcZQ'])->assertForbidden();
});

test('admins add a clip from a YouTube link, edit it and remove it', function () {
    $this->actingAs($this->admin)->post(route('admin.songs.store'), [
        'title' => 'Bohemian Rhapsody',
        'artist' => 'Queen',
        'link' => 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ&t=1m5s',
        'end' => '1:20',
    ])->assertSessionHasNoErrors();

    $song = Song::sole();
    expect($song->youtube_id)->toBe('fJ9rUzIMcZQ')->and($song->start_seconds)->toBe(65)->and($song->end_seconds)->toBe(80);

    $this->get(route('admin.songs.index'))->assertInertia(fn ($page) => $page
        ->component('admin/Songs')
        ->where('songs.data.0.title', 'Bohemian Rhapsody')
        ->where('songs.data.0.start', '1:05')
        ->where('songs.data.0.end', '1:20')
        ->where('songs.data.0.clip_url', 'https://www.youtube-nocookie.com/embed/fJ9rUzIMcZQ?start=65&end=80&rel=0&playsinline=1'));

    $this->put(route('admin.songs.update', $song), [
        'title' => 'We Will Rock You',
        'artist' => '',
        'link' => 'https://youtu.be/-tJYN-eG1zk',
        'start' => '0:30',
        'end' => '',
    ])->assertSessionHasNoErrors();

    $song->refresh();
    expect($song->title)->toBe('We Will Rock You')->and($song->artist)->toBeNull()
        ->and($song->youtube_id)->toBe('-tJYN-eG1zk')->and($song->start_seconds)->toBe(30)->and($song->end_seconds)->toBeNull();

    $this->delete(route('admin.songs.destroy', $song))->assertRedirect();
    expect(Song::count())->toBe(0)->and(Song::withTrashed()->count())->toBe(1);
});

test('the link must be a YouTube video and the times must make sense', function () {
    $this->actingAs($this->admin);

    $this->post(route('admin.songs.store'), ['title' => 'Not YouTube', 'link' => 'https://vimeo.com/123'])->assertSessionHasErrors('link');
    $this->post(route('admin.songs.store'), ['title' => 'Odd time', 'link' => 'https://youtu.be/fJ9rUzIMcZQ', 'start' => 'soon'])->assertSessionHasErrors('start');
    $this->post(route('admin.songs.store'), ['title' => 'Backwards', 'link' => 'https://youtu.be/fJ9rUzIMcZQ', 'start' => '1:00', 'end' => '0:50'])->assertSessionHasErrors('end');
    $this->post(route('admin.songs.store'), ['title' => '', 'link' => 'https://youtu.be/fJ9rUzIMcZQ'])->assertSessionHasErrors('title');
    expect(Song::count())->toBe(0);
});

test('YouTube links of every kind are understood', function (string $link, ?string $id, ?int $start) {
    expect(YouTube::videoId($link))->toBe($id)->and(YouTube::startIn($link))->toBe($start);
})->with([
    ['https://www.youtube.com/watch?v=fJ9rUzIMcZQ', 'fJ9rUzIMcZQ', null],
    ['youtube.com/watch?feature=share&v=fJ9rUzIMcZQ&t=75', 'fJ9rUzIMcZQ', 75],
    ['https://youtu.be/fJ9rUzIMcZQ?si=abc&t=90', 'fJ9rUzIMcZQ', 90],
    ['https://m.youtube.com/shorts/fJ9rUzIMcZQ', 'fJ9rUzIMcZQ', null],
    ['https://www.youtube-nocookie.com/embed/fJ9rUzIMcZQ?start=12', 'fJ9rUzIMcZQ', 12],
    ['https://music.youtube.com/watch?v=fJ9rUzIMcZQ&t=1h2m3s', 'fJ9rUzIMcZQ', 3723],
    ['fJ9rUzIMcZQ', 'fJ9rUzIMcZQ', null],
    ['https://www.youtube.com/watch?v=short', null, null],
    ['https://example.com/watch?v=fJ9rUzIMcZQ', null, null],
]);
