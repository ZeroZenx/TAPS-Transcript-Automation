import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { requestsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatDate } from '../lib/utils';
import { Eye, FileText, Search } from 'lucide-react';

const STATUS_OPTIONS = [
  'All',
  'New',
  'PENDING',
  'In progress',
  'Completed',
  'Cancelled',
];

export function MyRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize status filter value to match database values
  const normalizeStatusForBackend = (status: string): string | undefined => {
    if (status === 'All') return undefined;
    // Map dropdown values to actual database values
    const statusMap: { [key: string]: string } = {
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
      'IN_REVIEW': 'In progress', // Map IN_REVIEW to In progress if that's what's in DB
      'PENDING': 'PENDING',
      'New': 'New',
      'In progress': 'In progress',
      'Completed': 'Completed',
      'Cancelled': 'Cancelled',
    };
    return statusMap[status] || status;
  };

  // For admin users, use getAll() to see all requests. For students, use getMy()
  const { data, isLoading } = useQuery({
    queryKey: ['requests', isAdmin ? 'all' : 'my', statusFilter],
    queryFn: () => {
      if (isAdmin) {
        // For admin, use getAll with status filter if not "All"
        const normalizedStatus = normalizeStatusForBackend(statusFilter);
        return requestsApi.getAll({
          status: normalizedStatus,
          limit: 1000, // Get a large number for admin view
        });
      } else {
        return requestsApi.getMy();
      }
    },
  });

  const requests = data?.data?.requests || [];

  // Filter requests (only client-side search filtering, status is handled by backend for admin)
  const filteredRequests = requests.filter((request: any) => {
    // For admin, status is already filtered by backend, only do search filtering
    // For students, do both status and search filtering
    if (isAdmin) {
      // Only search filtering for admin
      const matchesSearch = searchQuery === '' || 
        (request.program && request.program.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (request.studentId && request.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (request.id && request.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (request.requestId && request.requestId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (request.studentEmail && request.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    } else {
      // For students, do status and search filtering
      // Case-insensitive status matching
      const requestStatus = (request.status || '').toLowerCase().trim();
      const filterStatus = (statusFilter || '').toLowerCase().trim();
      const matchesStatus = statusFilter === 'All' || 
        requestStatus === filterStatus ||
        (filterStatus === 'completed' && requestStatus === 'completed') ||
        (filterStatus === 'cancelled' && requestStatus === 'cancelled') ||
        (filterStatus === 'in_review' && requestStatus === 'in_review') ||
        (filterStatus === 'in progress' && requestStatus === 'in progress');
      const matchesSearch = searchQuery === '' || 
        (request.program && request.program.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (request.studentId && request.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (request.id && request.id.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    }
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Requests</h1>
        <p className="text-muted-foreground mt-2">
          View and track your transcript requests
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by program or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
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
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transcript Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                {requests.length === 0 ? 'No requests yet' : 'No requests match your filters'}
              </p>
              {requests.length === 0 && (
                <Link to="/requests/new">
                  <Button className="mt-4">Submit Request</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Request ID</th>
                    <th className="text-left p-3 text-sm font-medium">Program</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">Last Updated</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
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
                      <td className="p-3 text-sm">{request.program}</td>
                      <td className="p-3">
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </td>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
