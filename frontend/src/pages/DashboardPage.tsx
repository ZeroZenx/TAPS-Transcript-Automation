import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { requestsApi, adminApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { FileText, Clock, CheckCircle, Users, DollarSign, GraduationCap, Library, UserCheck, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDate } from '../lib/utils';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'STUDENT';

  // Fetch data based on role
  const { data: requestsData } = useQuery({
    queryKey: ['requests', 'dashboard', role],
    queryFn: () => {
      if (role === 'STUDENT') {
        return requestsApi.getMy();
      } else {
        return requestsApi.getAll({ limit: 10 });
      }
    },
    enabled: role !== 'ADMIN',
  });

  const { data: adminStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    enabled: role === 'ADMIN',
  });

  const requests = requestsData?.data?.requests || [];
  const activeRequests = requests.filter((r: any) => 
    ['PENDING', 'IN_REVIEW', 'APPROVED'].includes(r.status)
  );

  // Role-specific widgets
  const renderStudentDashboard = () => {
    const lastRequests = requests.slice(0, 5);
    
    return (
      <>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {user?.name}</h2>
            <p className="text-muted-foreground mt-1">Manage your transcript requests</p>
          </div>
          <Link to="/requests/new">
            <Button size="lg">Submit Request</Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Requests in progress
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Your last 5 requests</CardDescription>
          </CardHeader>
          <CardContent>
            {lastRequests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No requests yet</p>
                <Link to="/requests/new">
                  <Button>Submit Your First Request</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {lastRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => navigate(`/requests/${request.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{request.id.substring(0, 8)}...</span>
                        <span className="font-medium">{request.program}</span>
                        <Badge variant={
                          request.status === 'COMPLETED' ? 'success' :
                          request.status === 'REJECTED' ? 'danger' :
                          request.status === 'IN_REVIEW' ? 'info' : 'warning'
                        }>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(request.requestDate)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  const renderDepartmentDashboard = (deptName: string, queuePath: string, icon: any) => {
    const pendingCount = requests.filter((r: any) => 
      r.status === 'PENDING' || r.status === 'IN_REVIEW'
    ).length;

    return (
      <>
        <div>
          <h2 className="text-2xl font-bold">{deptName} Dashboard</h2>
          <p className="text-muted-foreground mt-1">Review and process transcript requests</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Awaiting Review</CardTitle>
              {icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Items awaiting your review
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={queuePath}>
              <Button className="w-full" size="lg">
                Go to Review Queue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderVerifierDashboard = () => {
    const pendingCount = requests.filter((r: any) => r.status === 'PENDING').length;
    const inReviewCount = requests.filter((r: any) => r.status === 'IN_REVIEW').length;

    return (
      <>
        <div>
          <h2 className="text-2xl font-bold">Verifier Dashboard</h2>
          <p className="text-muted-foreground mt-1">Verify and approve transcript requests</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inReviewCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/queue/verifier">
              <Button variant="outline" className="w-full justify-start">
                <UserCheck className="mr-2 h-4 w-4" />
                Verify Requests Queue
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderProcessorDashboard = () => {
    const readyCount = requests.filter((r: any) => r.status === 'APPROVED').length;

    return (
      <>
        <div>
          <h2 className="text-2xl font-bold">Processor Dashboard</h2>
          <p className="text-muted-foreground mt-1">Process approved transcript requests</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ready to Process</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{readyCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Approved requests ready
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/processor">
              <Button className="w-full" size="lg">
                Open Processing Queue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderAdminDashboard = () => {
    const stats = adminStats?.data?.stats || {};

    return (
      <>
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground mt-1">System overview and management</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card 
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate('/queue/verifier?filter=all')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.requests || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Click to view all requests
              </p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate('/queue/verifier?filter=pending')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Click to view pending requests
              </p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate('/queue/verifier?filter=completed')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Click to view completed requests
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/admin/users">
              <Button className="w-full" size="lg">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {role === 'STUDENT' && renderStudentDashboard()}
      {role === 'LIBRARY' && renderDepartmentDashboard('Library', '/queue/library', <Library className="h-4 w-4 text-muted-foreground" />)}
      {role === 'BURSAR' && renderDepartmentDashboard('Bursar', '/queue/bursar', <DollarSign className="h-4 w-4 text-muted-foreground" />)}
      {role === 'ACADEMIC' && renderDepartmentDashboard('Academic', '/queue/academic', <GraduationCap className="h-4 w-4 text-muted-foreground" />)}
      {role === 'VERIFIER' && renderVerifierDashboard()}
      {role === 'PROCESSOR' && renderProcessorDashboard()}
      {role === 'ADMIN' && renderAdminDashboard()}
    </div>
  );
}
