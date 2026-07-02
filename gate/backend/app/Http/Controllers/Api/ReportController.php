<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Reports\ReportQueryService;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportQueryService $reports)
    {
    }

    public function attendance(Request $request)
    {
        $type = $request->input('type', 'basic');

        return match ($type) {
            'day' => $this->reports->getReportsByDay($request),
            'basic' => $this->reports->getReportsByDateRangeBasic($request),
            'basic_new' => $this->reports->getReportsByDateRangeBasicNew($request),
            'range' => $this->reports->getReportsByDateRange($request),
            'filtered' => $this->reports->getReportsByDateRangeFiltered($request),
            'basic_date' => $this->reports->getReportsByDateforBasicReport($request),
            'daily_issues' => $this->reports->getReportsByDateforDailyIssuesReport($request),
            default => $this->reports->getReports($request),
        };
    }

    public function issues(Request $request)
    {
        $status = $request->input('status', 'all');

        return match ($status) {
            'justified' => $this->reports->getReportsByDateRangeforJustified($request),
            'unjustified' => $this->reports->getReportsByDateRangeforUnjustified($request),
            'export' => $this->reports->getReportsByDateRangeforExportIssues($request),
            'list' => $this->reports->getIssues($request),
            'unjustified_stats' => $this->reports->getUnjustifiedIssues($request),
            'justified_stats' => $this->reports->getJustifiedIssues($request),
            default => $this->reports->getIssues($request),
        };
    }

    public function companies(Request $request)
    {
        return $this->reports->getCompaniesReports($request);
    }

    public function companyIssues(Request $request)
    {
        return $this->reports->getCompaniesIssues($request);
    }

    public function departments(Request $request)
    {
        return $this->reports->getReports($request);
    }

    public function individual(Request $request)
    {
        return $this->reports->getIndividualReport($request);
    }

    public function advanced(Request $request)
    {
        return $this->reports->advanced($request);
    }

    public function lateEmployeesPercentage(Request $request)
    {
        return $this->reports->getLateEmployeesPercentage($request);
    }
}
