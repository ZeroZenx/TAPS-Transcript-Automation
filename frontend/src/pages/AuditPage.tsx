import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatDate } from '../lib/utils';
import { Search, Calendar, User, FileText, Download } from 'lucide-react';

export function AuditPage() {
  const [filters, setFilters] = useState({
    requestId: '',
    userId: '',
    action: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit', filters],
    queryFn: () => auditApi.getLogs(filters),
  });

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => auditApi.getStats(),
  });

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination;

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('CREATED')) return 'success';
    if (action.includes('UPDATED')) return 'info';
    if (action.includes('DELETED')) return 'danger';
    if (action.includes('LOGIN')) return 'purple';
    return 'warning';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          Complete audit trail of all system activities and changes
        </p>
      </div>

      {/* Statistics Cards */}
      {stats?.data && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data.totalLogs || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Actions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data.logsByAction?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data.logsByUser?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data.recentActivity?.length || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Request ID</label>
              <Input
                placeholder="Search by Request ID"
                value={filters.requestId}
                onChange={(e) => handleFilterChange('requestId', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">User ID</label>
              <Input
                placeholder="Search by User ID"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Input
                placeholder="Filter by action"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              />
            </div>
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
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({
                  requestId: '',
                  userId: '',
                  action: '',
                  startDate: '',
                  endDate: '',
                  page: 1,
                  limit: 50,
                })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium">Timestamp</th>
                      <th className="text-left p-3 text-sm font-medium">User</th>
                      <th className="text-left p-3 text-sm font-medium">Action</th>
                      <th className="text-left p-3 text-sm font-medium">Request</th>
                      <th className="text-left p-3 text-sm font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr key={log.id} className="border-b hover:bg-accent">
                        <td className="p-3 text-sm">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {log.user?.name || 'System'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {log.user?.email || 'N/A'}
                            </span>
                            {log.user?.role && (
                              <Badge variant="outline" className="w-fit mt-1">
                                {log.user.role}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">
                          {log.request ? (
                            <div className="flex flex-col">
                              <span className="font-mono text-xs">
                                {log.request.requestId || log.request.id.substring(0, 8)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {log.request.studentEmail}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          <details className="cursor-pointer">
                            <summary className="text-muted-foreground hover:text-foreground">
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => handleFilterChange('page', pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => handleFilterChange('page', pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

