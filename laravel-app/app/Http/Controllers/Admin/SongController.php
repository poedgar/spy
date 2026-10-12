<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Song;
use App\Support\YouTube;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Sing It Out's clips, for site administrators: a YouTube link and the
 * stretch of it to play. Removing one only hides it from new rounds.
 */
class SongController extends Controller
{
    public const PER_PAGE = 50;

    public function index(Request $request): Response
    {
        $search = trim($request->string('q')->toString());

        $songs = Song::query()
            ->withCount('rounds')
            ->when(mb_strlen($search) >= 2, function ($query) use ($search) {
                $like = '%'.addcslashes(mb_strtolower($search), '%_\\').'%';
                $query->where(fn ($query) => $query
                    ->whereRaw("lower(title) like ? escape '\\'", [$like])
                    ->orWhereRaw("lower(coalesce(artist, '')) like ? escape '\\'", [$like]));
            })
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Song $song) => [
                'id' => $song->id,
                'title' => $song->title,
                'artist' => $song->artist,
                'link' => YouTube::watchUrl($song->youtube_id, $song->start_seconds),
                'clip_url' => $song->embedUrl(),
                'start' => YouTube::clock($song->start_seconds),
                'end' => $song->end_seconds === null ? null : YouTube::clock($song->end_seconds),
                'rounds' => (int) $song->getAttribute('rounds_count'),
                'created_at' => $song->created_at?->toIso8601String(),
            ]);

        return inertia('admin/Songs', [
            'songs' => $songs,
            'search' => $search,
            'total' => Song::count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Song::create($this->validated($request));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Song added.')]);

        return back();
    }

    public function update(Request $request, Song $song): RedirectResponse
    {
        $song->update($this->validated($request));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Song saved.')]);

        return back();
    }

    public function destroy(Song $song): RedirectResponse
    {
        $song->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Song removed.')]);

        return back();
    }

    /**
     * The song's details, with the video and times read from what was typed.
     * Without a start time, the link's own (?t=) is used.
     *
     * @return array{title: string, artist: string|null, youtube_id: string, start_seconds: int, end_seconds: int|null}
     */
    private function validated(Request $request): array
    {
        $time = function (string $attribute, mixed $value, Closure $fail) {
            if (YouTube::seconds(is_string($value) ? $value : null) === null) {
                $fail(__('Write a time like 1:15.'));
            }
        };

        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'artist' => ['nullable', 'string', 'max:150'],
            'link' => ['required', 'string', 'max:300', function (string $attribute, mixed $value, Closure $fail) {
                if (YouTube::videoId(is_string($value) ? $value : '') === null) {
                    $fail(__('Paste a link to a YouTube video.'));
                }
            }],
            'start' => ['nullable', 'string', $time],
            'end' => ['nullable', 'string', $time],
        ]);

        $link = (string) $data['link'];
        $start = filled($data['start'] ?? null) ? (int) YouTube::seconds($data['start']) : (YouTube::startIn($link) ?? 0);
        $end = filled($data['end'] ?? null) ? YouTube::seconds($data['end']) : null;

        if ($end !== null && $end <= $start) {
            throw ValidationException::withMessages(['end' => __('The clip must end after it starts.')]);
        }

        return [
            'title' => trim((string) $data['title']),
            'artist' => filled($data['artist'] ?? null) ? trim((string) $data['artist']) : null,
            'youtube_id' => (string) YouTube::videoId($link),
            'start_seconds' => $start,
            'end_seconds' => $end,
        ];
    }
}
