<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Gate\MovementService;
use App\Domain\AccessControl\AccessCatalog;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlateMovementController extends Controller
{
    public function __construct(private readonly MovementService $movements) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()->can(AccessCatalog::routePermission('gate_plate_search')), 403);

        return Inertia::render('gate/PlateMovements');
    }

    public function search(Request $request): JsonResponse
    {
        abort_unless($request->user()->can(AccessCatalog::resourceReadPermission('employees')), 403);

        $filters = $request->validate([
            'platenumber' => ['required', 'string', 'max:20'],
            'mvtype' => ['nullable', 'in:Check-In,Check-Out'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return response()->json($this->movements->searchByPlate($filters));
    }
}
