<?php

namespace App\Http\Controllers\Inertia;

use App\Application\Gate\BaseService;
use App\Application\Personnel\DepartmentTreeService;
use App\Application\Reports\EmployeeNoteService;
use App\Application\Reports\ReportQueryService;
use App\Domain\AccessControl\AccessCatalog;
use App\Domain\Audit\Models\AppLog;
use App\Domain\Identity\Models\User;
use App\Domain\Personnel\Models\Gender;
use App\Domain\Personnel\Models\Rank;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\CompanyReportFilterRequest;
use App\Http\Requests\Reports\DeleteEmployeeNoteRequest;
use App\Http\Requests\Reports\ReportFilterRequest;
use App\Http\Requests\Reports\StoreEmployeeNoteRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * Field/translation-key/issue-flag triples for the CSV export columns.
     * Must stay in sync with NOTES_VIEW_COLUMNS in resources/js/config/reportPresets.ts.
     */
    private const EXPORT_CSV_COLUMNS = [
        ['field' => 'department', 'headerKey' => 'reports.columns.department', 'issueField' => null],
        ['field' => 'rank_category', 'headerKey' => 'reports.columns.rankCategory', 'issueField' => null],
        ['field' => 'rank', 'headerKey' => 'reports.columns.rank', 'issueField' => null],
        ['field' => 'military_number', 'headerKey' => 'reports.columns.militaryNumber', 'issueField' => null],
        ['field' => 'gender', 'headerKey' => 'reports.columns.gender', 'issueField' => null],
        ['field' => 'fullname_ar', 'headerKey' => 'reports.columns.fullname', 'issueField' => null],
        ['field' => 'mvdate', 'headerKey' => 'reports.columns.date', 'issueField' => null],
        ['field' => 'dakhool', 'headerKey' => 'reports.columns.checkIn', 'issueField' => 'hasEntryIssue'],
        ['field' => 'khorooj', 'headerKey' => 'reports.columns.checkOut', 'issueField' => 'hasExitIssue'],
        ['field' => 'notes', 'headerKey' => 'reports.columns.notes', 'issueField' => null],
        ['field' => 'created_by', 'headerKey' => 'reports.columns.createdBy', 'issueField' => null],
    ];

    public function __construct(
        private readonly ReportQueryService $reports,
        private readonly EmployeeNoteService $notes,
        private readonly DepartmentTreeService $departmentTree,
        private readonly BaseService $baseService,
    ) {}

    public function reports(Request $request): Response
    {
        return $this->renderPreset($request, 'reports', 'reports');
    }

    public function issues(Request $request): Response
    {
        return $this->renderPreset($request, 'issues', 'issues');
    }

    public function justified(Request $request): Response
    {
        return $this->renderPreset($request, 'justified', 'justified');
    }

    public function unjustified(Request $request): Response
    {
        return $this->renderPreset($request, 'unjustified', 'unjustified');
    }

    public function exportReports(Request $request): Response
    {
        return $this->renderPreset($request, 'export_reports', 'export');
    }

    public function individualReport(Request $request): Response
    {
        return $this->renderPreset($request, 'individual_report', 'individual');
    }

    public function companiesReporting(Request $request): Response
    {
        return $this->renderPreset($request, 'companies_reporting', 'companiesReporting');
    }

    public function companiesIssues(Request $request): Response
    {
        return $this->renderPreset($request, 'companies_issues', 'companiesIssues');
    }

    public function deactivatedEmployees(Request $request): Response
    {
        return $this->renderPreset($request, 'deactivated_employees', 'deactivatedEmployees');
    }

    public function expiredCards(Request $request): Response
    {
        return $this->renderPreset($request, 'expired_cards', 'expiredCards');
    }

    public function deactivatedUnreturnedCards(Request $request): Response
    {
        return $this->renderPreset($request, 'deactivated_unreturned_cards', 'deactivatedUnreturnedCards');
    }

    public function companiesDeactivatedEmployees(Request $request): Response
    {
        return $this->renderPreset($request, 'companies_deactivated_employees', 'companiesDeactivatedEmployees');
    }

    public function companiesExpiredCards(Request $request): Response
    {
        return $this->renderPreset($request, 'companies_expired_cards', 'companiesExpiredCards');
    }

    public function companiesDeactivatedUnreturnedCards(Request $request): Response
    {
        return $this->renderPreset($request, 'companies_deactivated_unreturned_cards', 'companiesDeactivatedUnreturnedCards');
    }

    public function data(ReportFilterRequest $request): JsonResponse
    {
        abort_unless($request->user()->can(AccessCatalog::resourceReadPermission('reports')), 403);

        $filters = $request->validated();
        $actor = $request->user();

        $result = match ($filters['preset']) {
            'reports' => $this->reports->basicReport($filters, $actor),
            'issues' => $this->reports->dailyIssues($filters, $actor),
            'justified' => $this->reports->justifiedReport($filters, $actor),
            'unjustified' => $this->reports->unjustifiedReport($filters, $actor),
            'export' => $this->reports->exportIssuesReport($filters, $actor),
            'individual' => $this->reports->individualReport($filters, $actor),
            'deactivatedEmployees' => $this->reports->deactivatedEmployees($filters, $actor),
            'expiredCards' => $this->reports->expiredCards($filters, $actor),
            'deactivatedUnreturnedCards' => $this->reports->deactivatedUnreturnedCards($filters, $actor),
            'companiesDeactivatedEmployees' => $this->reports->companiesDeactivatedEmployees($filters, $actor),
            'companiesExpiredCards' => $this->reports->companiesExpiredCards($filters, $actor),
            'companiesDeactivatedUnreturnedCards' => $this->reports->companiesDeactivatedUnreturnedCards($filters, $actor),
        };

        $this->logReportSearch($filters['preset'], $actor);

        return response()->json($result);
    }

    /**
     * Streams the exportReports CSV directly from a cursor over the matching rows, grouped
     * by department then employee - no row-count ceiling, unlike the paginated JSON endpoint.
     */
    public function exportCsv(ReportFilterRequest $request): StreamedResponse
    {
        abort_unless($request->user()->can(AccessCatalog::resourceReadPermission('reports')), 403);
        abort_unless($request->validated('preset') === 'export', 404);

        $filters = $request->validated();
        $actor = $request->user();

        $this->logReportSearch('export', $actor);

        return response()->streamDownload(function () use ($filters, $actor) {
            $handle = fopen('php://output', 'w');

            if ($handle === false) {
                throw new \RuntimeException('Unable to open output stream for CSV export.');
            }

            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, array_map(
                fn (array $column) => trans($column['headerKey']),
                self::EXPORT_CSV_COLUMNS,
            ));

            $currentDepartment = null;
            $currentEmployeeId = null;

            foreach ($this->reports->exportIssuesCursor($filters, $actor) as $row) {
                if ($row['department'] !== $currentDepartment) {
                    $currentDepartment = $row['department'];
                    $currentEmployeeId = null;
                    fputcsv($handle, [trans('reports.columns.department').': '.$currentDepartment]);
                }

                if ($row['id'] !== $currentEmployeeId) {
                    $currentEmployeeId = $row['id'];
                    fputcsv($handle, [
                        trans('reports.columns.fullname').': '.$row['fullname_ar'].
                        ' — '.trans('reports.columns.militaryNumber').': '.$row['military_number'],
                    ]);
                }

                fputcsv($handle, array_map(function (array $column) use ($row) {
                    $value = $row[$column['field']] ?? '';
                    $flagged = $column['issueField'] && ($row[$column['issueField']] ?? false);

                    return $flagged ? "⚠️ {$value}" : $value;
                }, self::EXPORT_CSV_COLUMNS));
            }

            fclose($handle);
        }, 'Export-Issues-Report.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function companiesData(CompanyReportFilterRequest $request): JsonResponse
    {
        abort_unless($request->user()->can(AccessCatalog::resourceReadPermission('reports')), 403);

        $filters = $request->validated();
        $actor = $request->user();

        $result = $filters['preset'] === 'companiesIssues'
            ? $this->reports->companiesIssues($filters, $actor)
            : $this->reports->companiesBasic($filters, $actor);

        $this->logReportSearch($filters['preset'], $actor);

        return response()->json($result);
    }

    /**
     * Audit trail for report access — a search isn't "about" one employee, so
     * emp_id is deliberately left null rather than legacy's emp_id=1 sentinel.
     */
    private function logReportSearch(string $presetKey, User $actor): void
    {
        $labels = [
            'reports' => 'Daily Basic Report',
            'issues' => 'Daily Issues Report',
            'justified' => 'Justified Report',
            'unjustified' => 'Unjustified Report',
            'export' => 'Export Issues Report',
            'individual' => 'Individual Report',
            'companiesReporting' => 'Companies Report',
            'companiesIssues' => 'Companies Issues Report',
            'deactivatedEmployees' => 'Deactivated Employees Report',
            'expiredCards' => 'Expired Cards Report',
            'deactivatedUnreturnedCards' => 'Deactivated Employees With Unreturned Cards Report',
            'companiesDeactivatedEmployees' => 'Deactivated Company Employees Report',
            'companiesExpiredCards' => 'Company Employees Expired Cards Report',
            'companiesDeactivatedUnreturnedCards' => 'Deactivated Company Employees With Unreturned Cards Report',
        ];

        AppLog::create([
            'emp_id' => null,
            'task' => ($labels[$presetKey] ?? $presetKey).' searched',
            'created_by_id' => $actor->id,
            'ip_address' => request()->ip(),
        ]);
    }

    public function addNote(StoreEmployeeNoteRequest $request): JsonResponse
    {
        abort_unless($request->user()->can(AccessCatalog::resourceWritePermission('reports')), 403);

        $note = $this->notes->addNote($request->validated(), $request->user());

        $note->load('createdBy');

        return response()->json([
            'id' => $note->id,
            'notes' => $note->notes,
            'created_by' => $note->createdBy?->displayName(),
            'notes_created_at' => $note->created_at?->toDateTimeString(),
        ]);
    }

    public function deleteNote(DeleteEmployeeNoteRequest $request): JsonResponse
    {
        abort_unless($request->user()->can(AccessCatalog::resourceWritePermission('reports')), 403);

        $this->notes->deleteNote((int) $request->input('emp_id'), (string) $request->input('mvdate'), $request->user());

        return response()->json(['success' => true]);
    }

    private function renderPreset(Request $request, string $routeKey, string $presetKey): Response
    {
        $user = $request->user();
        abort_unless($user->can(AccessCatalog::routePermission($routeKey)), 403);

        return Inertia::render('reports/ReportPage', [
            'presetKey' => $presetKey,
            'departments' => $this->departmentTree->getNestedTree(),
            'ranks' => Rank::with('category')->orderBy('ordre')->get(),
            'genders' => Gender::orderBy('id')->get(['id', 'name_ar', 'name_en']),
            'bases' => $this->baseService->list(),
        ]);
    }
}
