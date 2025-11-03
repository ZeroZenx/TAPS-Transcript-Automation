import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatDate } from '../lib/utils';
import { Download, BarChart3, TrendingUp, Calendar, FileText } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';

export function ReportsPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    department: '',
    program: '',
    studentEmail: '',
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['reports-summary', filters.startDate, filters.endDate],
    queryFn: () => reportsApi.getSummary({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    }),
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async (format: 'json' | 'csv' = 'csv') => {
    try {
      const response = await reportsApi.getReports({
        ...filters,
        format,
      });

      if (format === 'csv') {
        // Download CSV
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: 'Success',
          description: 'Report exported successfully',
        });
      } else {
        // Download JSON
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: 'Success',
          description: 'Report exported successfully',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  const summaryData = summary?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Generate comprehensive reports and view system analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      {summaryLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : summaryData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.totalRequests || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time requests
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryData.averageProcessingTimeDays !== null 
                  ? `${summaryData.averageProcessingTimeDays} days`
                  : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average completion time
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {summaryData.byStatus && Object.entries(summaryData.byStatus).slice(0, 3).map(([status, count]: [string, any]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{status}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Date Range</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-muted-foreground">Start: </span>
                  <span>{summaryData.dateRange?.start ? formatDate(summaryData.dateRange.start) : 'All time'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">End: </span>
                  <span>{summaryData.dateRange?.end ? formatDate(summaryData.dateRange.end) : 'Now'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Department</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
              >
                <option value="">All Departments</option>
                <option value="LIBRARY">Library</option>
                <option value="BURSAR">Bursar</option>
                <option value="ACADEMIC">Academic</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Program</label>
              <Input
                placeholder="Filter by program"
                value={filters.program}
                onChange={(e) => handleFilterChange('program', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Student Email</label>
              <Input
                placeholder="Filter by student email"
                value={filters.studentEmail}
                onChange={(e) => handleFilterChange('studentEmail', e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => setFilters({
                startDate: '',
                endDate: '',
                status: '',
                department: '',
                program: '',
                studentEmail: '',
              })}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Department Statistics */}
      {summaryData?.byDepartment && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Library Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <Badge variant="outline">{summaryData.byDepartment.library.total}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Approved</span>
                  <Badge variant="success">{summaryData.byDepartment.library.approved}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <Badge variant="warning">{summaryData.byDepartment.library.pending}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bursar Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <Badge variant="outline">{summaryData.byDepartment.bursar.total}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Approved</span>
                  <Badge variant="success">{summaryData.byDepartment.bursar.approved}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <Badge variant="warning">{summaryData.byDepartment.bursar.pending}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Academic Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <Badge variant="outline">{summaryData.byDepartment.academic.total}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Approved</span>
                  <Badge variant="success">{summaryData.byDepartment.academic.approved}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <Badge variant="warning">{summaryData.byDepartment.academic.pending}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Requests */}
      {summaryData?.recentRequests && summaryData.recentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summaryData.recentRequests.map((request: any) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">
                        {request.requestId || request.id.substring(0, 8)}
                      </span>
                      <span className="text-sm">{request.studentEmail}</span>
                      <Badge variant="outline">{request.program}</Badge>
                      <Badge variant={
                        request.status === 'COMPLETED' ? 'success' :
                        request.status === 'REJECTED' ? 'danger' :
                        request.status === 'IN_REVIEW' ? 'info' : 'warning'
                      }>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(request.requestDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

