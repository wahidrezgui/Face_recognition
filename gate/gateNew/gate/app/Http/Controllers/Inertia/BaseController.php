<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Gate\BaseService;
use App\Domain\AccessControl\AccessCatalog;
use App\Domain\Gate\Models\Base;
use App\Domain\Gate\Models\Gate;
use App\Domain\Gate\Models\Zone;
use App\Http\Controllers\Controller;
use App\Http\Requests\Gate\BaseRequest;
use App\Http\Requests\Gate\GateRequest;
use App\Http\Requests\Gate\ZoneRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BaseController extends Controller
{
    public function __construct(private readonly BaseService $baseService) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('departments')), 403);

        return Inertia::render('admin/Bases', [
            'bases' => $this->baseService->list(),
        ]);
    }

    private function assertCanManage(Request $request): void
    {
        abort_unless($request->user()->can(AccessCatalog::resourceWritePermission('departments')), 403);
    }

    public function store(BaseRequest $request): RedirectResponse
    {
        $this->assertCanManage($request);
        $this->baseService->createBase($request->validated());

        return back();
    }

    public function update(BaseRequest $request, Base $base): RedirectResponse
    {
        $this->assertCanManage($request);
        $this->baseService->updateBase($base, $request->validated());

        return back();
    }

    public function destroy(Request $request, Base $base): RedirectResponse
    {
        $this->assertCanManage($request);
        $this->baseService->deleteBase($base);

        return back();
    }

    public function storeGate(GateRequest $request, Base $base): RedirectResponse
    {
        $this->assertCanManage($request);
        $this->baseService->createGate($base, $request->validated());

        return back();
    }

    public function updateGate(GateRequest $request, Gate $gate): RedirectResponse
    {
        $this->assertCanManage($request);
        $this->baseService->updateGate($gate, $request->validated());

        return back();
    }

    public function destroyGate(Request $request, Gate $gate): RedirectResponse
    {
        $this->assertCanManage($request);
        $this->baseService->deleteGate($gate);

        return back();
    }

    public function storeZone(ZoneRequest $request, Base $base): RedirectResponse
    {
        $this->assertCanManage($request);
        $this->baseService->createZone($base, $request->validated());

        return back();
    }

    public function updateZone(ZoneRequest $request, Zone $zone): RedirectResponse
    {
        $this->assertCanManage($request);
        $this->baseService->updateZone($zone, $request->validated());

        return back();
    }

    public function destroyZone(Request $request, Zone $zone): RedirectResponse
    {
        $this->assertCanManage($request);
        $this->baseService->deleteZone($zone);

        return back();
    }
}
