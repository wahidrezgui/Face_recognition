<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Personnel\CheckTimeService;
use App\Application\Personnel\DepartmentTreeService;
use App\Domain\AccessControl\AccessCatalog;
use App\Domain\Personnel\Models\CheckTime;
use App\Domain\Personnel\Models\Gender;
use App\Domain\Personnel\Models\RankCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Personnel\StoreCheckTimeRequest;
use App\Http\Requests\Personnel\UpdateCheckTimeRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CheckTimeController extends Controller
{
    public function __construct(
        private readonly CheckTimeService $checkTimeService,
        private readonly DepartmentTreeService $departmentTree,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceReadPermission('settings')), 403);

        $depId = (int) $request->query('dep_id', 0);

        return Inertia::render('settings/Settings', [
            'departments' => $this->departmentTree->getNestedTree(),
            'genders' => Gender::orderBy('id')->get(['id', 'name_ar', 'name_en']),
            'rankCategories' => RankCategory::orderBy('ordre')->get(['id', 'name_ar', 'name_en']),
            'selectedDepId' => $depId,
            'checkTimes' => $depId > 0 ? $this->checkTimeService->listForDepartment($depId) : [],
        ]);
    }

    public function store(StoreCheckTimeRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('settings')), 403);

        $this->checkTimeService->create($request->validated());

        return back();
    }

    public function update(UpdateCheckTimeRequest $request, CheckTime $checkTime): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('settings')), 403);

        $this->checkTimeService->update($checkTime, $request->validated());

        return back();
    }

    public function destroy(Request $request, CheckTime $checkTime): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::resourceWritePermission('settings')), 403);

        $this->checkTimeService->delete($checkTime);

        return back();
    }
}
