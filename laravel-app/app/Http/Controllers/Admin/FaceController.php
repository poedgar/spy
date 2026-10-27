<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Face;
use App\Support\EmotionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Response;

/**
 * Name the Emotion's faces, for site administrators: how often players
 * name each one right, which level that puts it at, and switching faces
 * that confuse everyone out of play.
 */
class FaceController extends Controller
{
    public const PER_PAGE = 60;

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'emotion' => ['nullable', Rule::in(EmotionCatalog::EMOTIONS)],
            'level' => ['nullable', 'integer', Rule::in(EmotionCatalog::LEVELS)],
            'sort' => ['nullable', Rule::in(['hardest', 'easiest', 'most_shown'])],
        ]);

        $rate = 'case when shown_count = 0 then null else cast(correct_count as float) / shown_count end';

        $faces = Face::query()
            ->when($filters['emotion'] ?? null, fn ($query, $emotion) => $query->where('emotion', $emotion))
            ->when($filters['level'] ?? null, fn ($query, $level) => $query->atLevel((int) $level))
            ->when(($filters['sort'] ?? null) === 'hardest', fn ($query) => $query->orderByRaw("{$rate} is null")->orderByRaw($rate))
            ->when(($filters['sort'] ?? null) === 'easiest', fn ($query) => $query->orderByRaw("{$rate} is null")->orderByRaw("{$rate} desc"))
            ->when(($filters['sort'] ?? null) === 'most_shown', fn ($query) => $query->orderByDesc('shown_count'))
            ->orderBy('emotion')
            ->orderBy('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Face $face) => [
                'id' => $face->id,
                'image_url' => $face->imageUrl(),
                'emotion' => $face->emotion,
                'variant' => $face->variant,
                'base_level' => $face->base_level,
                'level' => $face->level(),
                'measured' => $face->shown_count >= EmotionCatalog::MIN_ANSWERS,
                'shown' => $face->shown_count,
                'hit_rate' => $face->hitRate() === null ? null : round($face->hitRate(), 2),
                'active' => $face->active,
            ]);

        return inertia('admin/Faces', [
            'faces' => $faces,
            'filters' => [
                'emotion' => $filters['emotion'] ?? null,
                'level' => isset($filters['level']) ? (int) $filters['level'] : null,
                'sort' => $filters['sort'] ?? null,
            ],
            'stats' => [
                'total' => Face::count(),
                'active' => Face::where('active', true)->count(),
                'measured' => Face::where('shown_count', '>=', EmotionCatalog::MIN_ANSWERS)->count(),
                'answers' => (int) Face::sum('shown_count'),
                'levels' => collect(EmotionCatalog::LEVELS)->mapWithKeys(fn (int $level) => [$level => Face::atLevel($level)->count()]),
            ],
            'rules' => [
                'min_answers' => EmotionCatalog::MIN_ANSWERS,
                'easy_from' => EmotionCatalog::EASY_FROM,
                'medium_from' => EmotionCatalog::MEDIUM_FROM,
            ],
        ]);
    }

    /** Takes a face out of play, or back in. */
    public function update(Request $request, Face $face): RedirectResponse
    {
        $data = $request->validate(['active' => ['required', 'boolean']]);
        $face->update(['active' => (bool) $data['active']]);

        return back();
    }
}
