<?php

namespace App\Application\Reports;

use App\Application\Personnel\DepartmentTreeService;
use App\Domain\AccessControl\DataScopeResolver;
use App\Domain\Gate\Models\Base;
use App\Domain\Identity\Models\User;
use App\Domain\Personnel\Models\CompanyTime;
use App\Domain\Personnel\Models\Employee;
use App\Domain\Reports\Models\EmployeeMovementLog;
use App\Domain\Reports\Models\EmployeeSpecificMovementsNote;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Read queries backing the report/issue pages — a direct port of the 7 live
 * (frontend-reachable) methods on legacy's ReportQueryService, plus the two
 * Companies variants. See PORTING_NOTES.md for the dead-code methods this
 * deliberately does not port, and the two Companies Issues bug fixes.
 */
class ReportQueryService
{
    private const PER_PAGE_DEFAULT = 25;

    public function __construct(
        private readonly DataScopeResolver $dataScope,
        private readonly DepartmentTreeService $departmentTree,
    ) {}

    /** "reports" preset — single date, no issue filter, shows every movement. */
    public function basicReport(array $filters, User $actor): array
    {
        $query = EmployeeSpecificMovementsNote::query();
        $this->applyPersonFilters($query, $filters, $actor);
        $this->applyNotesViewBaseGateFilter($query, $filters);
        $query->whereDate('mvdate', $filters['date']);

        $mvtype = $filters['mvtype'] ?? null;
        $this->applyPlainMvtypeFilter($query, $mvtype);

        return $this->paginateNotesView($query, $filters, $mvtype);
    }

    /** "issues" preset — single date, entry_issue OR exit_issue. */
    public function dailyIssues(array $filters, User $actor): array
    {
        $query = EmployeeSpecificMovementsNote::query();
        $this->applyPersonFilters($query, $filters, $actor);
        $this->applyNotesViewBaseGateFilter($query, $filters);
        $query->whereDate('mvdate', $filters['date']);
        $this->applyHasIssueFilter($query);

        $mvtype = $filters['mvtype'] ?? null;
        $this->applyIssueMvtypeFilter($query, $mvtype);

        return $this->paginateNotesView($query, $filters, $mvtype);
    }

    /** "justified" preset — date range, has a non-empty note. */
    public function justifiedReport(array $filters, User $actor): array
    {
        $query = EmployeeSpecificMovementsNote::query();
        $this->applyPersonFilters($query, $filters, $actor);
        $this->applyNotesViewBaseGateFilter($query, $filters);
        $this->applyDateRangeFilter($query, $filters);
        $query->whereNotNull('notes')->where('notes', '!=', '');

        $mvtype = $filters['mvtype'] ?? null;
        $this->applyIssueMvtypeFilter($query, $mvtype);

        return $this->paginateNotesView($query, $filters, $mvtype);
    }

    /** "unjustified" preset — date range, has an issue with no note. */
    public function unjustifiedReport(array $filters, User $actor): array
    {
        $query = EmployeeSpecificMovementsNote::query();
        $this->applyPersonFilters($query, $filters, $actor);
        $this->applyNotesViewBaseGateFilter($query, $filters);
        $this->applyDateRangeFilter($query, $filters);
        $this->applyHasIssueFilter($query);
        $query->where(fn (Builder $q) => $q->whereNull('notes')->orWhere('notes', ''));

        $mvtype = $filters['mvtype'] ?? null;
        $this->applyIssueMvtypeFilter($query, $mvtype);

        return $this->paginateNotesView($query, $filters, $mvtype);
    }

    /** "export" preset (the /exportReports page's own data source) — date range, any issue. */
    public function exportIssuesReport(array $filters, User $actor): array
    {
        $mvtype = $filters['mvtype'] ?? null;

        return $this->paginateNotesView($this->exportIssuesQueryBuilder($filters, $actor), $filters, $mvtype);
    }

    /**
     * Same filters as exportIssuesReport(), but yields every matching row one at a time via
     * a cursor instead of paginating - used by the CSV export endpoint so a large date range
     * never has to hold its full result set in memory. Ordered by department then employee
     * then date so the CSV builder can detect group boundaries in a single forward pass.
     *
     * @return \Generator<int, array<string, mixed>>
     */
    public function exportIssuesCursor(array $filters, User $actor): \Generator
    {
        $mvtype = $filters['mvtype'] ?? null;

        $query = $this->exportIssuesQueryBuilder($filters, $actor)
            ->orderBy('department')
            ->orderBy('id')
            ->orderBy('mvdate');

        foreach ($query->cursor() as $row) {
            yield $this->formatNotesViewRow($row, $mvtype);
        }
    }

    /** @return Builder<EmployeeSpecificMovementsNote> */
    private function exportIssuesQueryBuilder(array $filters, User $actor): Builder
    {
        $query = EmployeeSpecificMovementsNote::query();
        $this->applyPersonFilters($query, $filters, $actor);
        $this->applyNotesViewBaseGateFilter($query, $filters);
        $this->applyDateRangeFilter($query, $filters);
        $this->applyHasIssueFilter($query);
        $this->applyIssueMvtypeFilter($query, $filters['mvtype'] ?? null);

        return $query;
    }

    /** "individual" preset — raw movement log, no issue logic. */
    public function individualReport(array $filters, User $actor): array
    {
        $query = EmployeeMovementLog::query();
        $this->applyPersonFilters($query, $filters, $actor);

        if (! empty($filters['base_ids'])) {
            $query->whereIn('base_id', $filters['base_ids']);
        }
        if (! empty($filters['gate_ids'])) {
            $query->whereIn('gate_id', $filters['gate_ids']);
        }
        if (! empty($filters['mvtype'])) {
            $query->where('mvtype', $filters['mvtype']);
        }

        $this->applyDateRangeFilter($query, $filters);

        $paginator = $query->orderBy('mvdate')->orderBy('mvtime')
            ->paginate($this->perPage($filters), ['*'], 'page', $this->page($filters));

        return [
            'data' => $paginator->items(),
            'total' => $paginator->total(),
        ];
    }

    /** "companiesReporting" preset — per-employee same-day check-in/out, no issue logic. */
    public function companiesBasic(array $filters, User $actor): array
    {
        // Legacy scopes company rosters via `is_employee=1` — confirmed against
        // live data that column is 0 on every real row (a dead marker never
        // actually set by anything), so that filter always returns zero real
        // records. The real signal, already established by the Companies page
        // itself, is `dep_id` pointing at an `is_company=1` department.
        $query = Employee::query()
            ->whereHas('department', fn (Builder $q) => $q->where('is_company', 1))
            ->where('active', 1);
        $this->applyCompanyScope($query, $filters, $actor);

        $day = $filters['day'] ?? now()->toDateString();
        $paginator = $query->with(['department', 'nationality'])
            ->latest('updated_at')
            ->paginate($this->perPage($filters), ['*'], 'page', $this->page($filters));

        $rows = $paginator->getCollection()->map(function (Employee $employee) use ($day) {
            $movements = $employee->movements()->where('mvdate', $day)
                ->whereIn('mvtype', ['Check-In', 'Check-Out'])->get();
            $checkin = $movements->where('mvtype', 'Check-In')->sortBy('mvtime')->first();
            $checkout = $movements->where('mvtype', 'Check-Out')->sortBy('mvtime')->last();

            return [
                'id' => $employee->id,
                'department' => $employee->department?->name_ar,
                'photo' => $employee->photo,
                'fullname_en' => $employee->fullname_en,
                'fullname_ar' => $employee->fullname_ar,
                'nationality' => $employee->nationality?->name_ar,
                'phone_number' => $employee->phone_number,
                'checkin' => $checkin ? "{$checkin->mvdate} - {$checkin->mvtime}" : null,
                'checkout' => $checkout ? "{$checkout->mvdate} - {$checkout->mvtime}" : null,
            ];
        });

        return ['data' => $rows->values()->all(), 'total' => $paginator->total()];
    }

    /**
     * "companiesIssues" preset — per-employee CompaniesTimes lookup, filtered
     * to only employees with an issue. Fixes two legacy bugs: (1) filters
     * BEFORE paginating, not after (legacy paginates the unfiltered employee
     * set then discards non-issue rows from the current page in PHP, so a
     * page can render with fewer rows than per_page and `total` counts
     * everyone, not just those with issues); (2) hasCompIssues() no longer
     * ORs together `start_time > in.mvtime` and `start_time < in.mvtime` —
     * literally "not equal", a tautology once anyone checks in at all — down
     * to the two conditions the paired message-builders already imply (early
     * check-in, late check-out).
     */
    public function companiesIssues(array $filters, User $actor): array
    {
        // Legacy scopes company rosters via `is_employee=1` — confirmed against
        // live data that column is 0 on every real row (a dead marker never
        // actually set by anything), so that filter always returns zero real
        // records. The real signal, already established by the Companies page
        // itself, is `dep_id` pointing at an `is_company=1` department.
        $query = Employee::query()
            ->whereHas('department', fn (Builder $q) => $q->where('is_company', 1))
            ->where('active', 1);
        $this->applyCompanyScope($query, $filters, $actor);

        $day = $filters['day'] ?? now()->toDateString();
        $mvtypes = array_filter((array) ($filters['mvtype'] ?? []));

        $candidates = $query->with(['department', 'nationality'])->get();

        $rows = $candidates
            ->map(function (Employee $employee) use ($day, $mvtypes) {
                $movements = $employee->movements()->where('mvdate', $day);
                if ($mvtypes !== []) {
                    $movements->whereIn('mvtype', $mvtypes);
                }
                $movements = $movements->get();

                $in = $movements->where('mvtype', 'Check-In')->sortBy('mvtime')->first();
                $out = $movements->where('mvtype', 'Check-Out')->sortBy('mvtime')->last();
                $checkTimes = CompanyTime::where('dep_id', $employee->dep_id)->first();

                if (! $this->hasCompanyIssue($in, $out, $checkTimes)) {
                    return null;
                }

                $inLabel = $this->companyCheckInMessage($checkTimes, $in);
                $outLabel = $this->companyCheckOutMessage($checkTimes, $out);

                return [
                    'id' => $employee->id,
                    'department' => $employee->department?->name_en,
                    'nationality' => $employee->nationality?->name_ar,
                    'fullname_en' => $employee->fullname_en,
                    'fullname_ar' => $employee->fullname_ar,
                    'remarks' => $employee->remarks,
                    'bloodtype' => $employee->bloodtype,
                    'phone' => $employee->phone_number,
                    'checkin' => $inLabel,
                    'checkout' => $outLabel,
                ];
            })
            ->filter()
            ->values();

        $page = $this->page($filters);
        $perPage = $this->perPage($filters);
        $paginator = new LengthAwarePaginator(
            $rows->forPage($page, $perPage)->values(),
            $rows->count(),
            $perPage,
            $page,
        );

        return ['data' => $paginator->items(), 'total' => $paginator->total()];
    }

    /** "deactivatedEmployees" preset — deactivated roster, employees only (not companies), department-scoped, no date filter. */
    public function deactivatedEmployees(array $filters, User $actor): array
    {
        return $this->deactivatedRosterReport($filters, $actor, companyOnly: false);
    }

    /** "companiesDeactivatedEmployees" preset — same as above, scoped to company workers instead. */
    public function companiesDeactivatedEmployees(array $filters, User $actor): array
    {
        return $this->deactivatedRosterReport($filters, $actor, companyOnly: true);
    }

    /**
     * "expiredCards" preset — badge expiry_date already passed, regardless of active status
     * (a compliance view: an expired card on an *active* employee is the case that matters
     * most). Same comparison as EmployeeService::list()'s expiredCount. No date filter.
     */
    public function expiredCards(array $filters, User $actor): array
    {
        return $this->expiredCardsReport($filters, $actor, companyOnly: false);
    }

    /** "companiesExpiredCards" preset — same as above, scoped to company workers instead. */
    public function companiesExpiredCards(array $filters, User $actor): array
    {
        return $this->expiredCardsReport($filters, $actor, companyOnly: true);
    }

    /**
     * "deactivatedUnreturnedCards" preset — deactivated employees still holding at least one
     * unreturned card (badge_log.returned_at IS NULL). No date filter.
     */
    public function deactivatedUnreturnedCards(array $filters, User $actor): array
    {
        return $this->deactivatedUnreturnedCardsReport($filters, $actor, companyOnly: false);
    }

    /** "companiesDeactivatedUnreturnedCards" preset — same as above, scoped to company workers instead. */
    public function companiesDeactivatedUnreturnedCards(array $filters, User $actor): array
    {
        return $this->deactivatedUnreturnedCardsReport($filters, $actor, companyOnly: true);
    }

    private function deactivatedRosterReport(array $filters, User $actor, bool $companyOnly): array
    {
        $query = $this->employeeOrCompanyQuery($companyOnly)->where('active', 0);
        $this->applyEmployeeStatusFilters($query, $filters, $actor);

        $paginator = $query->with(['department', 'rank', 'defaultBase'])
            ->orderBy('fullname_ar')
            ->paginate($this->perPage($filters), ['*'], 'page', $this->page($filters));

        $rows = $paginator->getCollection()->map(fn (Employee $employee) => $this->formatEmployeeStatusRow($employee));

        return ['data' => $rows->values()->all(), 'total' => $paginator->total()];
    }

    private function expiredCardsReport(array $filters, User $actor, bool $companyOnly): array
    {
        $query = $this->employeeOrCompanyQuery($companyOnly)->whereDate('expiry_date', '<', now()->toDateString());
        $this->applyEmployeeStatusFilters($query, $filters, $actor);

        $paginator = $query->with(['department', 'rank', 'defaultBase'])
            ->orderBy('expiry_date')
            ->paginate($this->perPage($filters), ['*'], 'page', $this->page($filters));

        $rows = $paginator->getCollection()->map(fn (Employee $employee) => [
            ...$this->formatEmployeeStatusRow($employee),
            'expiry_date' => $employee->expiry_date?->format('Y-m-d'),
            'active' => $employee->active ? trans('reports.values.active') : trans('reports.values.deactivated'),
        ]);

        return ['data' => $rows->values()->all(), 'total' => $paginator->total()];
    }

    private function deactivatedUnreturnedCardsReport(array $filters, User $actor, bool $companyOnly): array
    {
        $query = $this->employeeOrCompanyQuery($companyOnly)
            ->where('active', 0)
            ->whereHas('badgeLogs', fn (Builder $q) => $q->whereNull('returned_at'));
        $this->applyEmployeeStatusFilters($query, $filters, $actor);

        $paginator = $query->with([
            'department', 'rank', 'defaultBase',
            'badgeLogs' => fn ($q) => $q->whereNull('returned_at')->orderByDesc('date_printed'),
        ])
            ->orderBy('fullname_ar')
            ->paginate($this->perPage($filters), ['*'], 'page', $this->page($filters));

        $rows = $paginator->getCollection()->map(function (Employee $employee) {
            $unreturned = $employee->badgeLogs;

            return [
                ...$this->formatEmployeeStatusRow($employee),
                'unreturned_card_count' => $unreturned->count(),
                'last_unreturned_card_date' => $unreturned->first()?->date_printed?->format('Y-m-d'),
            ];
        });

        return ['data' => $rows->values()->all(), 'total' => $paginator->total()];
    }

    /**
     * Base query for the 6 employee-status presets — `$companyOnly` picks the same
     * is_company split already established by the Employees/Companies pages
     * (Employee::applyFilters()'s default `is_company=0` branch, Companies'
     * `is_company=1` roster). Without this, "deactivated employees" would silently
     * mix in company workers, which none of this app's other employee lists do.
     */
    private function employeeOrCompanyQuery(bool $companyOnly): Builder
    {
        return Employee::query()->whereHas('department', fn (Builder $q) => $q->where('is_company', $companyOnly ? 1 : 0));
    }

    /** Shared department/rank/military_number/fullname/gender/base row shape for the 6 employee-status presets. */
    private function formatEmployeeStatusRow(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'department' => $this->localizedName($employee->department),
            'rank' => $this->localizedName($employee->rank),
            'military_number' => $employee->military_number,
            'fullname' => app()->getLocale() === 'en'
                ? ($employee->fullname_en ?: $employee->fullname_ar)
                : ($employee->fullname_ar ?: $employee->fullname_en),
            'fullname_ar' => $employee->fullname_ar,
            'fullname_en' => $employee->fullname_en,
            'gender' => $this->localizedName($employee->gender),
            'base' => $this->localizedName($employee->defaultBase),
        ];
    }

    /**
     * These 6 presets are new (not ported from a legacy view that only ever had Arabic
     * columns), so — unlike the other 8 presets' department/rank/gender columns, which
     * stay Arabic-only by design (baked into the notes/movement SQL views) — there's no
     * reason to hardcode name_ar here. `App::setLocale()` (SetLocale middleware) already
     * reflects the session's current UI locale, so this can safely pick the matching name.
     */
    private function localizedName(?object $model): ?string
    {
        if (! $model) {
            return null;
        }

        return app()->getLocale() === 'en'
            ? ($model->name_en ?? $model->name_ar)
            : ($model->name_ar ?? $model->name_en);
    }

    /**
     * Person + department filters for the 3 employee-status presets, querying the real
     * `employees` table directly (not a movement-log view). Deliberately separate from
     * applyPersonFilters(): that helper's `gender` filter matches a flattened string
     * column that only exists on the notes/movement views — `employees` only has
     * `gender_id`, so this filters via the `gender` relation instead. The frontend's
     * gender picker still sends the Arabic name string either way (matches genderOptions
     * in ReportSearchPanel.vue), so no frontend change is needed for this to line up.
     */
    private function applyEmployeeStatusFilters(Builder $query, array $filters, User $actor): void
    {
        if (! empty($filters['military_number'])) {
            $query->where('military_number', $filters['military_number']);
        }

        if (! empty($filters['fullname_ar'])) {
            $query->where('fullname_ar', 'like', '%'.$filters['fullname_ar'].'%');
        }

        if (! empty($filters['gender'])) {
            $query->whereHas('gender', fn (Builder $q) => $q->where('name_ar', $filters['gender']));
        }

        if (! empty($filters['rank_ids'])) {
            $query->whereIn('rank_id', $filters['rank_ids']);
        }

        $allowed = $this->dataScope->resolveDepartmentIds($actor, 'departments');

        if (! empty($filters['department_id'])) {
            $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds((int) $filters['department_id']);
            if ($allowed !== []) {
                $departmentIds = array_values(array_intersect($departmentIds, $allowed));
            }
            $query->whereIn('dep_id', $departmentIds);
        } elseif ($allowed !== []) {
            $query->whereIn('dep_id', $allowed);
        }
    }

    /**
     * Department (hierarchy-expanded, clamped to the actor's own
     * DataScopeResolver scope), rank (flat ids — matches the Employees
     * page's own established simplification, no rank-tree expansion),
     * military number, name, and gender filters — identical column names on
     * both report views.
     */
    private function applyPersonFilters(Builder $query, array $filters, User $actor): void
    {
        if (! empty($filters['military_number'])) {
            $query->where('military_number', $filters['military_number']);
        }

        if (! empty($filters['fullname_ar'])) {
            $query->where('fullname_ar', 'like', '%'.$filters['fullname_ar'].'%');
        }

        if (! empty($filters['gender'])) {
            $query->where('gender', $filters['gender']);
        }

        if (! empty($filters['rank_ids'])) {
            $query->whereIn('rank_id', $filters['rank_ids']);
        }

        $allowed = $this->dataScope->resolveDepartmentIds($actor, 'departments');

        if (! empty($filters['department_id'])) {
            $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds((int) $filters['department_id']);
            if ($allowed !== []) {
                $departmentIds = array_values(array_intersect($departmentIds, $allowed));
            }
            $query->whereIn('dep_id', $departmentIds);
        } elseif ($allowed !== []) {
            $query->whereIn('dep_id', $allowed);
        }
    }

    /** Notes-view base/gate filter — matches against either the first or last movement of the day. */
    private function applyNotesViewBaseGateFilter(Builder $query, array $filters): void
    {
        if (! empty($filters['base_ids'])) {
            $baseIds = $filters['base_ids'];
            $query->where(fn (Builder $q) => $q->whereIn('first_base_id', $baseIds)->orWhereIn('last_base_id', $baseIds));
        }

        if (! empty($filters['gate_ids'])) {
            $gateIds = $filters['gate_ids'];
            $query->where(fn (Builder $q) => $q->whereIn('first_gate_id', $gateIds)->orWhereIn('last_gate_id', $gateIds));
        }
    }

    private function applyDateRangeFilter(Builder $query, array $filters): void
    {
        if (! empty($filters['from_date']) && ! empty($filters['to_date'])) {
            $query->whereBetween('mvdate', [$filters['from_date'], $filters['to_date']]);
        }
    }

    private function applyHasIssueFilter(Builder $query): void
    {
        $query->where(fn (Builder $q) => $q->where('entry_issue', 1)->orWhere('exit_issue', 1));
    }

    /** basicReport's mvtype filter — plain equality against either leg of the day, no issue coupling. */
    private function applyPlainMvtypeFilter(Builder $query, ?string $mvtype): void
    {
        if ($mvtype === null) {
            return;
        }

        $query->where(fn (Builder $q) => $q->where('first_mvtype', $mvtype)->orWhere('last_mvtype', $mvtype));
    }

    /** The 4 issue-aware presets' mvtype filter — narrows to the matching issue flag AND the leg equality. */
    private function applyIssueMvtypeFilter(Builder $query, ?string $mvtype): void
    {
        if ($mvtype === null) {
            return;
        }

        if ($mvtype === 'Check-In') {
            $query->where('entry_issue', 1);
        } elseif ($mvtype === 'Check-Out') {
            $query->where('exit_issue', 1);
        }

        $this->applyPlainMvtypeFilter($query, $mvtype);
    }

    /**
     * @return array{data: list<array<string, mixed>>, total: int}
     */
    private function paginateNotesView(Builder $query, array $filters, ?string $mvtype): array
    {
        $paginator = $query->orderBy('mvdate')
            ->paginate($this->perPage($filters), ['*'], 'page', $this->page($filters));

        $rows = $paginator->getCollection()->map(fn (EmployeeSpecificMovementsNote $row) => $this->formatNotesViewRow($row, $mvtype));

        return ['data' => $rows->values()->all(), 'total' => $paginator->total()];
    }

    /** @return array<string, mixed> */
    private function formatNotesViewRow(EmployeeSpecificMovementsNote $row, ?string $mvtype): array
    {
        $checkInLabel = $this->formatLeg($row->checkin_mvtime, $row->first_base, $row->first_gate, $row->first_automatic);
        $checkOutLabel = $this->formatLeg($row->checkout_mvtime, $row->last_base, $row->last_gate, $row->last_automatic);

        return [
            'id' => $row->id,
            'department' => $row->department,
            'rank' => $row->rank,
            'rank_category' => $row->rank_category,
            'military_number' => $row->military_number,
            'fullname_ar' => $row->fullname_ar,
            'fullname_en' => $row->fullname_en,
            'gender' => $row->gender,
            'mvdate' => $row->mvdate,
            'dakhool' => $mvtype === 'Check-Out' ? null : $checkInLabel,
            'khorooj' => $mvtype === 'Check-In' ? null : $checkOutLabel,
            'notes' => $row->notes,
            'created_by' => $row->created_by,
            'notes_created_at' => $row->notes_created_at,
            'hasEntryIssue' => (bool) $row->entry_issue,
            'hasExitIssue' => (bool) $row->exit_issue,
        ];
    }

    private function formatLeg(?string $time, ?string $base, ?string $gate, ?int $automatic): ?string
    {
        if (! $time) {
            return null;
        }

        $mode = $automatic === 0 ? trans('reports.manual') : ($automatic === 1 ? trans('reports.automatic') : null);

        return implode(' | ', array_filter([$time, $base, $gate, $mode]));
    }

    /** Companies presets share the same "scope to the actor's own department, optionally narrowed to one company" rule. */
    private function applyCompanyScope(Builder $query, array $filters, User $actor): void
    {
        $allowed = $this->dataScope->resolveDepartmentIds($actor, 'departments');

        if (! empty($filters['dep_id'])) {
            $departmentIds = $this->departmentTree->getDepartmentAndAllChildrenDepartmentIds((int) $filters['dep_id']);
            if ($allowed !== []) {
                $departmentIds = array_values(array_intersect($departmentIds, $allowed));
            }
            $query->whereIn('dep_id', $departmentIds);

            return;
        }

        if ($allowed !== []) {
            $query->whereIn('dep_id', $allowed);
        }
    }

    private function hasCompanyIssue(?object $in, ?object $out, ?CompanyTime $checkTimes): bool
    {
        if (! $checkTimes) {
            return false;
        }

        return ($in && $checkTimes->start_time > $in->mvtime)
            || ($out && $checkTimes->end_time < $out->mvtime);
    }

    private function companyCheckInMessage(?CompanyTime $checkTimes, ?object $in): ?string
    {
        if (! $in) {
            return null;
        }

        return $checkTimes && $checkTimes->start_time > $in->mvtime ? ".{$in->mvtime}" : $in->mvtime;
    }

    private function companyCheckOutMessage(?CompanyTime $checkTimes, ?object $out): ?string
    {
        if (! $out) {
            return null;
        }

        return $checkTimes && $checkTimes->end_time < $out->mvtime ? ".{$out->mvtime}" : $out->mvtime;
    }

    private function perPage(array $filters): int
    {
        return (int) ($filters['per_page'] ?? self::PER_PAGE_DEFAULT);
    }

    private function page(array $filters): int
    {
        return (int) ($filters['page'] ?? 1);
    }
}
