<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $games = $request->user()
            ->gamePlayers()
            ->with('game.host')
            ->get()
            ->pluck('game')
            ->values();

        return inertia('Dashboard', [
            'games' => $games,
        ]);
    }
}
