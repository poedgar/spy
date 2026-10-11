<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AgeTier;
use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Support\LocationCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The Spy location pool, for site administrators. Removing a location only
 * hides it from new rounds; past rounds still name it.
 */
class LocationController extends Controller
{
    public const PER_PAGE = 50;

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', Rule::in(array_keys(LocationCatalog::categories()))],
            'tier' => ['nullable', Rule::enum(AgeTier::class)],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));

        $locations = Location::query()
            ->when(mb_strlen($search) >= 2, function ($query) use ($search) {
                $like = '%'.addcslashes(mb_strtolower($search), '%_\\').'%';
                $query->where(fn ($query) => $query
                    ->whereRaw("lower(en) like ? escape '\\'", [$like])
                    ->orWhereRaw("lower(uk) like ? escape '\\'", [$like]));
            })
            ->when($filters['category'] ?? null, fn ($query, $category) => $query->where('category', $category))
            ->when($filters['tier'] ?? null, fn ($query, $tier) => $query->where('tier', $tier))
            ->orderBy('category')
            ->orderBy('en')
            ->paginate(self::PER_PAGE, ['id', 'en', 'uk', 'category', 'tier'])
            ->withQueryString();

        return inertia('admin/Locations', [
            'locations' => $locations,
            'filters' => ['q' => $search, 'category' => $filters['category'] ?? null, 'tier' => $filters['tier'] ?? null],
            'categories' => LocationCatalog::categories(),
            'tiers' => array_column(AgeTier::cases(), 'value'),
            'total' => Location::count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Location::create($this->validated($request));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Location added.')]);

        return back();
    }

    public function update(Request $request, Location $location): RedirectResponse
    {
        $location->update($this->validated($request));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Location saved.')]);

        return back();
    }

    public function destroy(Location $location): RedirectResponse
    {
        $location->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Location removed.')]);

        return back();
    }

    /**
     * @return array{en: string, uk: string, category: string, tier: string}
     */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'en' => ['required', 'string', 'max:100'],
            'uk' => ['required', 'string', 'max:100'],
            'category' => ['required', Rule::in(array_keys(LocationCatalog::categories()))],
            'tier' => ['required', Rule::enum(AgeTier::class)],
        ]);

        return [
            'en' => trim((string) $data['en']),
            'uk' => trim((string) $data['uk']),
            'category' => (string) $data['category'],
            'tier' => (string) $data['tier'],
        ];
    }
}
