import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatDate } from '../lib/utils';
import { Eye, Search } from 'lucide-react';

const getDeptStatusBadge = (status: string) => {
  if (!status || status === 'PENDING') return <Badge variant="warning">Pending</Badge>;
  if (['Hold', 'Issue', 'Owing', 'Outstanding'].includes(status)) {
    return <Badge variant="warning">{status}</Badge>;
  }
  return <Badge variant="success">{status}</Badge>;
};

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

export function ProcessorPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'processor'],
    queryFn: () => requestsApi.getAll({ limit: 1000 }), // Get all requests for Processor
  });

  const requests = data?.data?.requests || [];

  // Filter requests: Show requests ready for processing
  // A request is ready when:
  // 1. Library has approved (not PENDING)
  // 2. Bursar has approved (not PENDING)
  // 3. Academic has completed (academicStatus = 'COMPLETED')
  const readyForProcessing = requests.filter((request: any) => {
    const libraryApproved = request.libraryStatus && request.libraryStatus !== 'PENDING';
    const bursarApproved = request.bursarStatus && request.bursarStatus !== 'PENDING';
    const academicCompleted = request.academicStatus === 'COMPLETED';
    
    return libraryApproved && bursarApproved && academicCompleted;
  });

  // Filter by search query (client-side search)
  const filteredRequests = readyForProcessing.filter((request: any) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      request.studentEmail?.toLowerCase().includes(query) ||
      request.program?.toLowerCase().includes(query) ||
      request.id?.toLowerCase().includes(query) ||
      (request.requestId && request.requestId.toLowerCase().includes(query)) ||
      (request.parchmentCode && request.parchmentCode.toLowerCase().includes(query)) ||
      (request.studentId && request.studentId.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Processing Queue</h1>
        <p className="text-muted-foreground mt-2">
          Process approved transcript requests
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Parchment Code, Student Email, Request ID, Student ID, or Program..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredRequests.length} of {readyForProcessing.length} requests ready for processing
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Approved Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'No requests found matching your search' 
                  : 'No requests ready for processing. Requests will appear here once Library, Bursar, and Academic have all completed their reviews.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Request ID</th>
                    <th className="text-left p-3 text-sm font-medium">Parchment Code</th>
                    <th className="text-left p-3 text-sm font-medium">Student Email</th>
                    <th className="text-left p-3 text-sm font-medium">Program</th>
                    <th className="text-left p-3 text-sm font-medium">Library</th>
                    <th className="text-left p-3 text-sm font-medium">Bursar</th>
                    <th className="text-left p-3 text-sm font-medium">Academic</th>
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
                      <td className="p-3 text-sm font-medium">{request.parchmentCode || 'N/A'}</td>
                      <td className="p-3 text-sm">{request.studentEmail}</td>
                      <td className="p-3 text-sm">{request.program || 'N/A'}</td>
                      <td className="p-3">
                        {getDeptStatusBadge(request.libraryStatus || 'PENDING')}
                      </td>
                      <td className="p-3">
                        {getDeptStatusBadge(request.bursarStatus || 'PENDING')}
                      </td>
                      <td className="p-3">
                        {getDeptStatusBadge(request.academicStatus || 'PENDING')}
                      </td>
                      <td className="p-3">
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {request.status || 'PENDING'}
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
