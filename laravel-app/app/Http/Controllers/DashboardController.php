<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $games = $request->user()
            ->gamePlayers()
            ->with('game')
            ->get()
            ->pluck('game')
            ->values();

        return inertia('Dashboard', [
            'games' => $games,
        ]);
    }
}
