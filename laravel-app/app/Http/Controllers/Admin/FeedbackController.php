<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Ideas and bug reports from players, for site administrators: read them,
 * mark them done, remove them.
 */
class FeedbackController extends Controller
{
    public const PER_PAGE = 50;

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'kind' => ['nullable', Rule::in(Feedback::KINDS)],
            'status' => ['nullable', Rule::in(['open', 'resolved'])],
        ]);

        $feedback = Feedback::query()
            ->with('user:id,name,codename,email')
            ->when($filters['kind'] ?? null, fn ($query, $kind) => $query->where('kind', $kind))
            ->when(($filters['status'] ?? null) === 'open', fn ($query) => $query->whereNull('resolved_at'))
            ->when(($filters['status'] ?? null) === 'resolved', fn ($query) => $query->whereNotNull('resolved_at'))
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Feedback $item) => [
                'id' => $item->id,
                'kind' => $item->kind,
                'message' => $item->message,
                'email' => $item->user !== null ? $item->user->email : $item->email,
                'user' => $item->user ? ['id' => $item->user->id, 'codename' => $item->user->codename, 'name' => $item->user->name] : null,
                'locale' => $item->locale,
                'user_agent' => $item->user_agent,
                'resolved' => $item->resolved_at !== null,
                'created_at' => $item->created_at?->toIso8601String(),
            ]);

        return inertia('admin/Feedback', [
            'feedback' => $feedback,
            'filters' => ['kind' => $filters['kind'] ?? null, 'status' => $filters['status'] ?? null],
            'stats' => [
                'open' => Feedback::whereNull('resolved_at')->count(),
                'ideas' => Feedback::whereNull('resolved_at')->where('kind', Feedback::KIND_IDEA)->count(),
                'bugs' => Feedback::whereNull('resolved_at')->where('kind', Feedback::KIND_BUG)->count(),
                'total' => Feedback::count(),
            ],
        ]);
    }

    /** Marks a message done, or open again. */
    public function update(Request $request, Feedback $feedback): RedirectResponse
    {
        $request->validate(['resolved' => ['required', 'boolean']]);
        $feedback->update(['resolved_at' => $request->boolean('resolved') ? now() : null]);

        return back();
    }

    public function destroy(Feedback $feedback): RedirectResponse
    {
        $feedback->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Message removed.')]);

        return back();
    }
}
