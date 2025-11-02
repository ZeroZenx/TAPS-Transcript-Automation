import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatDate } from '../lib/utils';
import { Eye } from 'lucide-react';

export function ProcessorPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['requests', 'processor'],
    queryFn: () => requestsApi.getAll({ status: 'APPROVED' }),
  });

  const requests = data?.data?.requests || [];

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
          <div className="text-sm text-muted-foreground">
            Showing only Approved requests
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
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No approved requests to process</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Request ID</th>
                    <th className="text-left p-3 text-sm font-medium">Student Email</th>
                    <th className="text-left p-3 text-sm font-medium">Program</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">Last Updated</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request: any) => (
                    <tr
                      key={request.id}
                      className="border-b hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => navigate(`/requests/${request.id}`)}
                    >
                      <td className="p-3 text-sm font-mono">{request.id.substring(0, 8)}...</td>
                      <td className="p-3 text-sm">{request.studentEmail}</td>
                      <td className="p-3 text-sm">{request.program}</td>
                      <td className="p-3">
                        <Badge variant="success">{request.status}</Badge>
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
