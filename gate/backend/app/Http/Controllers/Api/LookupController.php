<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Lookups\LookupService;
use App\Support\Tree\BaseTreeService;
use App\Support\Tree\RankTreeService;
use Illuminate\Http\Request;

class LookupController extends Controller
{
    public function __construct(
        private LookupService $lookups,
        private RankTreeService $rankTreeService,
        private BaseTreeService $baseTreeService,
    ) {
    }

    public function ranks()
    {
        return $this->lookups->ranks();
    }

    public function rankCategories()
    {
        return $this->lookups->ranksCateg();
    }

    public function nationalities()
    {
        return $this->lookups->nationalities();
    }

    public function zones()
    {
        return $this->lookups->zones();
    }

    public function zoneInfo(int $id)
    {
        return $this->lookups->zoneInfo($id);
    }

    public function ranksTree()
    {
        return response()->json(['ranks' => $this->rankTreeService->getAllRanksTree()]);
    }

    public function basesTree()
    {
        return response()->json(['bases' => $this->baseTreeService->getAllBasesTree()]);
    }

    public function gatesByBases(Request $request)
    {
        return response()->json($this->baseTreeService->getGatesByBases($request));
    }
}
