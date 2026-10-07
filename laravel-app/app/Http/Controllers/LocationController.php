<?php

namespace App\Http\Controllers;

use App\Support\LocationCatalog;
use Inertia\Response;

class LocationController extends Controller
{
    /**
     * The full location guide, filtered by tier and searched client-side.
     */
    public function index(): Response
    {
        return inertia('Locations', [
            'locations' => LocationCatalog::all(),
            'categories' => LocationCatalog::categories(),
        ]);
    }
}
