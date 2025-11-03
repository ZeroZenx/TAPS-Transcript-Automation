import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { requestsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatDate } from '../lib/utils';
import { Search, Eye } from 'lucide-react';

interface QueuePageProps {
  queueType: 'verifier' | 'library' | 'bursar' | 'academic';
}

const queueConfig = {
  verifier: { 
    title: 'Verify Requests', 
    statusField: 'verifierNotes',
    role: 'VERIFIER'
  },
  library: { 
    title: 'Library Review Queue', 
    statusField: 'libraryStatus',
    role: 'LIBRARY'
  },
  bursar: { 
    title: 'Bursar Review Queue', 
    statusField: 'bursarStatus',
    role: 'BURSAR'
  },
  academic: { 
    title: 'Academic Review Queue', 
    statusField: 'academicStatus',
    role: 'ACADEMIC'
  },
};

const STATUS_OPTIONS = ['All', 'PENDING', 'IN_REVIEW', 'In progress', 'APPROVED', 'REJECTED', 'COMPLETED'];

export function QueuePage({ queueType }: QueuePageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const config = queueConfig[queueType];
  
  // Initialize status filter from URL params or default
  const urlFilter = searchParams.get('filter');
  const initialStatus = urlFilter === 'pending' ? 'PENDING' : 
                       urlFilter === 'completed' ? 'COMPLETED' : 
                       urlFilter === 'all' ? 'All' : 'All';
  
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<string>(''); // For Verifier: "needs-action" or "hold-present"
  const [page, setPage] = useState(1);
  const [limit] = useState(100); // Increased limit for better pagination
  
  // Update status filter when URL changes
  useEffect(() => {
    if (urlFilter === 'pending') {
      setStatusFilter('PENDING');
    } else if (urlFilter === 'completed') {
      setStatusFilter('COMPLETED');
    } else if (urlFilter === 'all') {
      setStatusFilter('All');
    }
    // Reset to page 1 when filter changes
    setPage(1);
  }, [urlFilter]);

  // Build query params for API call
  const queryParams: any = {
    page,
    limit,
  };

  // Only add status filter if it's not "All"
  if (statusFilter !== 'All' && statusFilter) {
    queryParams.status = statusFilter;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'queue', queueType, queryParams],
    queryFn: () => requestsApi.getAll(queryParams),
  });

  const requests = data?.data?.requests || [];
  const pagination = data?.data?.pagination;

  // Client-side filtering (only for search and quick filters, not status since backend handles it)
  const filteredRequests = requests.filter((request: any) => {
    // Search filter (client-side since backend doesn't support it yet)
    const matchesSearch = searchQuery === '' || 
      request.studentEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.program?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.requestId && request.requestId.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Quick filters for Verifier (client-side only)
    let matchesQuickFilter = true;
    if (queueType === 'verifier' && quickFilter) {
      if (quickFilter === 'needs-action') {
        // Needs action: Any dept status is pending or has issues
        matchesQuickFilter = 
          !request.libraryStatus || request.libraryStatus === 'PENDING' ||
          !request.bursarStatus || request.bursarStatus === 'PENDING' ||
          !request.academicStatus || request.academicStatus === 'PENDING' ||
          request.status === 'PENDING' || request.status === 'IN_REVIEW';
      } else if (quickFilter === 'hold-present') {
        // Hold present: Any dept has Hold, Issue, Owing, or Outstanding
        matchesQuickFilter = 
          request.libraryStatus === 'Hold' || request.libraryStatus === 'Issue' ||
          request.bursarStatus === 'Hold' || request.bursarStatus === 'Owing' ||
          request.academicStatus === 'Hold' || request.academicStatus === 'Outstanding';
      }
    }
    
    // Status is already filtered by backend, so we don't filter by status here
    return matchesSearch && matchesQuickFilter;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'purple';
      case 'REJECTED':
        return 'danger';
      case 'IN_REVIEW':
        return 'info';
      case 'APPROVED':
        return 'success';
      case 'PENDING':
      default:
        return 'warning';
    }
  };

  const getDeptStatusBadge = (status: string) => {
    if (!status || status === 'PENDING') return null;
    if (['Hold', 'Issue', 'Owing', 'Outstanding'].includes(status)) {
      return <Badge variant="warning">{status}</Badge>;
    }
    return <Badge variant="success">{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold">{config.title}</h1>
        <p className="text-muted-foreground mt-2">
          {queueType === 'verifier' 
            ? 'View all requests and drive status changes'
            : 'Review and process transcript requests'}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] max-w-[400px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={queueType === 'verifier' ? 'Search by email or program...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {queueType === 'verifier' && (
              <>
                <div className="w-full sm:w-40">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status === 'All' ? 'All Statuses' : status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-40">
                  <select
                    value={quickFilter}
                    onChange={(e) => setQuickFilter(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Requests</option>
                    <option value="needs-action">Needs Action</option>
                    <option value="hold-present">Hold Present</option>
                  </select>
                </div>
              </>
            )}
            {queueType !== 'verifier' && (
              <div className="w-full sm:w-40">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="All">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_REVIEW">In Review</option>
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-card z-10 shadow-sm">
                    <tr className="border-b bg-card">
                      <th className="text-left p-3 text-sm font-medium bg-card">Request ID</th>
                    {queueType === 'verifier' && (
                      <>
                        <th className="text-left p-3 text-sm font-medium bg-card">Student Email</th>
                      </>
                    )}
                    <th className="text-left p-3 text-sm font-medium bg-card">Program</th>
                    {queueType === 'verifier' && (
                      <>
                        <th className="text-left p-3 text-sm font-medium bg-card">Library</th>
                        <th className="text-left p-3 text-sm font-medium bg-card">Bursar</th>
                        <th className="text-left p-3 text-sm font-medium bg-card">Academic</th>
                      </>
                    )}
                    <th className="text-left p-3 text-sm font-medium bg-card">Status</th>
                    {queueType !== 'verifier' && (
                      <th className="text-left p-3 text-sm font-medium bg-card">{config.title.includes('Library') ? 'Library' : config.title.includes('Bursar') ? 'Bursar' : 'Academic'} Status</th>
                    )}
                    <th className="text-left p-3 text-sm font-medium bg-card">Last Updated</th>
                    <th className="text-right p-3 text-sm font-medium bg-card">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request: any) => (
                    <tr
                      key={request.id}
                      className="border-b hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => navigate(`/requests/${request.id}`)}
                    >
                      <td className="p-3 text-sm font-mono">{request.requestId || request.id.substring(0, 8)}</td>
                      {queueType === 'verifier' && (
                        <td className="p-3 text-sm">{request.studentEmail}</td>
                      )}
                      <td className="p-3 text-sm">{request.program}</td>
                      {queueType === 'verifier' && (
                        <>
                          <td className="p-3">
                            {getDeptStatusBadge(request.libraryStatus)}
                          </td>
                          <td className="p-3">
                            {getDeptStatusBadge(request.bursarStatus)}
                          </td>
                          <td className="p-3">
                            {getDeptStatusBadge(request.academicStatus)}
                          </td>
                        </>
                      )}
                      <td className="p-3">
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      {queueType !== 'verifier' && (
                        <td className="p-3">
                          {getDeptStatusBadge(request[config.statusField]) || 
                            <Badge variant="warning">Pending</Badge>}
                        </td>
                      )}
                      <td className="p-3 text-sm text-muted-foreground">
                        {formatDate(request.lastUpdated || request.requestDate)}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/requests/${request.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} requests
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
