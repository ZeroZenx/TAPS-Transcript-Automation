import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';
import { analyticsApi, slaApi, monitoringApi, backupApi, scheduledReportsApi } from '../services/api';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  BarChart3, Activity, Shield, Database, Clock, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Download, Upload, RefreshCw, Server, AlertCircle,
  Plus, Edit, Trash2, Play
} from 'lucide-react';
import { formatDate } from '../lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AdvancedDashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('analytics');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  // Scheduled Reports form state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [reportForm, setReportForm] = useState({
    name: '',
    reportType: 'ANALYTICS',
    frequency: 'DAILY',
    dayOfWeek: 1,
    dayOfMonth: 1,
    recipients: [] as string[],
    enabled: true,
  });
  const [newRecipientEmail, setNewRecipientEmail] = useState('');

  // Analytics queries
  const { data: performanceData } = useQuery({
    queryKey: ['analytics', 'performance', dateRange],
    queryFn: () => analyticsApi.getPerformance({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
  });

  const { data: trendsData } = useQuery({
    queryKey: ['analytics', 'trends'],
    queryFn: () => analyticsApi.getVolumeTrends({ period: '30', groupBy: 'day' }),
  });

  const { data: bottlenecksData } = useQuery({
    queryKey: ['analytics', 'bottlenecks'],
    queryFn: () => analyticsApi.getBottlenecks(),
  });

  const { data: forecastData } = useQuery({
    queryKey: ['analytics', 'forecast'],
    queryFn: () => analyticsApi.getForecast({ days: '30' }),
  });

  // SLA queries
  const { data: slaComplianceData } = useQuery({
    queryKey: ['sla', 'compliance'],
    queryFn: () => slaApi.getCompliance(),
  });

  // Monitoring queries
  const { data: healthData } = useQuery({
    queryKey: ['monitoring', 'health'],
    queryFn: () => monitoringApi.getHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: errorsData } = useQuery({
    queryKey: ['monitoring', 'errors'],
    queryFn: () => monitoringApi.getErrors({ resolved: 'false', limit: '50' }),
  });

  const { data: performanceMetricsData } = useQuery({
    queryKey: ['monitoring', 'performance'],
    queryFn: () => monitoringApi.getPerformance({ hours: '24' }),
  });

  // Backup queries
  const { data: backupsData } = useQuery({
    queryKey: ['backups'],
    queryFn: () => backupApi.getAll(),
  });

  // Scheduled Reports queries
  const { data: scheduledReportsData } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: () => scheduledReportsApi.getAll(),
  });

  // Scheduled Reports mutations
  const createReportMutation = useMutation({
    mutationFn: (data: any) => scheduledReportsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Scheduled report created successfully' });
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      setReportDialogOpen(false);
      resetReportForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create report',
        description: error.response?.data?.error || 'Failed to create scheduled report',
        variant: 'destructive',
      });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => scheduledReportsApi.update(id, data),
    onSuccess: () => {
      toast({ title: 'Scheduled report updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      setReportDialogOpen(false);
      setEditingReport(null);
      resetReportForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update report',
        description: error.response?.data?.error || 'Failed to update scheduled report',
        variant: 'destructive',
      });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => scheduledReportsApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Scheduled report deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete report',
        description: error.response?.data?.error || 'Failed to delete scheduled report',
        variant: 'destructive',
      });
    },
  });

  const runReportMutation = useMutation({
    mutationFn: (id: string) => scheduledReportsApi.run(id),
    onSuccess: () => {
      toast({ title: 'Report generated and sent successfully' });
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to run report',
        description: error.response?.data?.error || 'Failed to run scheduled report',
        variant: 'destructive',
      });
    },
  });

  const resetReportForm = () => {
    setReportForm({
      name: '',
      reportType: 'ANALYTICS',
      frequency: 'DAILY',
      dayOfWeek: 1,
      dayOfMonth: 1,
      recipients: [],
      enabled: true,
    });
    setNewRecipientEmail('');
    setEditingReport(null);
  };

  const openCreateDialog = () => {
    resetReportForm();
    setReportDialogOpen(true);
  };

  const openEditDialog = (report: any) => {
    setEditingReport(report);
    setReportForm({
      name: report.name,
      reportType: report.reportType,
      frequency: report.frequency,
      dayOfWeek: report.dayOfWeek || 1,
      dayOfMonth: report.dayOfMonth || 1,
      recipients: JSON.parse(report.recipients || '[]'),
      enabled: report.enabled,
    });
    setReportDialogOpen(true);
  };

  const handleAddRecipient = () => {
    if (newRecipientEmail && !reportForm.recipients.includes(newRecipientEmail)) {
      setReportForm({
        ...reportForm,
        recipients: [...reportForm.recipients, newRecipientEmail],
      });
      setNewRecipientEmail('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setReportForm({
      ...reportForm,
      recipients: reportForm.recipients.filter((e) => e !== email),
    });
  };

  const handleSubmitReport = () => {
    if (!reportForm.name || reportForm.recipients.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Name and at least one recipient email are required',
        variant: 'destructive',
      });
      return;
    }

    if (editingReport) {
      updateReportMutation.mutate({ id: editingReport.id, data: reportForm });
    } else {
      createReportMutation.mutate(reportForm);
    }
  };

  // Mutations
  const createBackupMutation = useMutation({
    mutationFn: () => backupApi.create({ backupType: 'FULL' }),
    onSuccess: () => {
      toast({ title: 'Backup created successfully' });
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Backup failed',
        description: error.response?.data?.error || 'Failed to create backup',
        variant: 'destructive',
      });
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (id: string) => backupApi.restore(id),
    onSuccess: () => {
      toast({ title: 'Database restored successfully' });
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Restore failed',
        description: error.response?.data?.error || 'Failed to restore backup',
        variant: 'destructive',
      });
    },
  });

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'sla', label: 'SLA Compliance', icon: Shield },
    { id: 'monitoring', label: 'System Monitoring', icon: Activity },
    { id: 'backup', label: 'Backup & Recovery', icon: Database },
    { id: 'reports', label: 'Scheduled Reports', icon: Clock },
  ];

  const performance = performanceData?.data || {};
  const trends = trendsData?.data?.trends || [];
  const bottlenecks = bottlenecksData?.data?.bottlenecks || [];
  const forecast = forecastData?.data?.forecast || [];
  const compliance = slaComplianceData?.data || {};
  const health = healthData?.data?.current || {};
  const errors = errorsData?.data?.errors || [];
  const backups = backupsData?.data?.backups || [];
  const scheduledReports = scheduledReportsData?.data?.reports || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Advanced Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive analytics, monitoring, and system management
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Date Range Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Library Avg Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performance.library?.avgProcessingTimeHours?.toFixed(1) || '0.0'}h
                </div>
                <p className="text-xs text-muted-foreground">
                  {performance.library?.totalProcessed || 0} processed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Bursar Avg Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performance.bursar?.avgProcessingTimeHours?.toFixed(1) || '0.0'}h
                </div>
                <p className="text-xs text-muted-foreground">
                  {performance.bursar?.totalProcessed || 0} processed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Academic Avg Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performance.academic?.avgProcessingTimeHours?.toFixed(1) || '0.0'}h
                </div>
                <p className="text-xs text-muted-foreground">
                  {performance.academic?.totalProcessed || 0} processed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Processor Avg Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performance.processor?.avgProcessingTimeHours?.toFixed(1) || '0.0'}h
                </div>
                <p className="text-xs text-muted-foreground">
                  {performance.processor?.totalProcessed || 0} processed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Volume Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Request Volume Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Total" />
                  <Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Completed" />
                  <Area type="monotone" dataKey="pending" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Pending" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bottlenecks */}
          <Card>
            <CardHeader>
              <CardTitle>Bottlenecks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bottlenecks.map((bottleneck: any) => (
                  <div key={bottleneck.department} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{bottleneck.department}</div>
                      <div className="text-sm text-muted-foreground">
                        {bottleneck.pendingCount} pending ({bottleneck.oldPendingCount} old)
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg wait: {bottleneck.avgWaitHours.toFixed(1)} hours
                      </div>
                    </div>
                    <Badge
                      variant={
                        bottleneck.severity === 'HIGH' ? 'destructive' :
                        bottleneck.severity === 'MEDIUM' ? 'default' : 'secondary'
                      }
                    >
                      {bottleneck.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Forecast */}
          <Card>
            <CardHeader>
              <CardTitle>30-Day Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Badge variant="outline">
                  Trend: {forecastData?.data?.trend || 'STABLE'}
                </Badge>
                <Badge variant="outline" className="ml-2">
                  Historical Avg: {forecastData?.data?.historicalAverage || 0} requests/day
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={forecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" name="Predicted" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SLA Compliance Tab */}
      {activeTab === 'sla' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SLA Compliance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(compliance.byDepartment || {}).map(([dept, data]: [string, any]) => (
                  <Card key={dept}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{dept}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {data.complianceRate?.toFixed(1) || '0.0'}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {data.met || 0} met / {data.total || 0} total
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Avg: {data.avgProcessingHours?.toFixed(1) || '0.0'}h
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending SLAs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Total Pending</div>
                    <div className="text-sm text-muted-foreground">
                      {compliance.pending?.total || 0} requests
                    </div>
                  </div>
                  <Badge>{compliance.pending?.total || 0}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <div>
                    <div className="font-medium">Approaching Breach</div>
                    <div className="text-sm text-muted-foreground">
                      {compliance.pending?.approachingBreach || 0} requests
                    </div>
                  </div>
                  <Badge variant="default">{compliance.pending?.approachingBreach || 0}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div>
                    <div className="font-medium">Breached</div>
                    <div className="text-sm text-muted-foreground">
                      {compliance.pending?.breached || 0} requests
                    </div>
                  </div>
                  <Badge variant="destructive">{compliance.pending?.breached || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* System Health Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {health.cpuUsage?.toFixed(1) || '0.0'}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {health.memoryUsage?.toFixed(1) || '0.0'}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{health.activeUsers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    health.status === 'HEALTHY' ? 'default' :
                    health.status === 'WARNING' ? 'default' : 'destructive'
                  }
                >
                  {health.status || 'UNKNOWN'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {(() => {
            try {
              const alerts = health.alerts 
                ? (typeof health.alerts === 'string' ? JSON.parse(health.alerts) : health.alerts)
                : [];
              return alerts.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Active Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alerts.map((alert: string, index: number) => (
                        <div key={index} className="p-3 border border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                          {alert}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            } catch {
              return null;
            }
          })()}

          {/* Error Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {errors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No errors found</p>
                ) : (
                  errors.map((error: any) => (
                    <div key={error.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={error.errorType === 'CRITICAL' ? 'destructive' : 'default'}>
                              {error.errorType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(error.createdAt)}
                            </span>
                          </div>
                          <div className="font-medium">{error.message}</div>
                          {error.endpoint && (
                            <div className="text-sm text-muted-foreground">
                              Endpoint: {error.endpoint}
                            </div>
                          )}
                        </div>
                        {!error.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Handle resolve
                              monitoringApi.resolveError(error.id).then(() => {
                                queryClient.invalidateQueries({ queryKey: ['monitoring', 'errors'] });
                                toast({ title: 'Error marked as resolved' });
                              });
                            }}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Backup & Recovery Tab */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Backup Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => createBackupMutation.mutate()}
                  disabled={createBackupMutation.isPending}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Create Backup
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    backupApi.export({ includeTypes: ['requests', 'users', 'auditLogs'] }).then((res) => {
                      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `taps-export-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      toast({ title: 'Export completed' });
                    });
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Recent Backups</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {backups.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No backups found</p>
                  ) : (
                    backups.map((backup: any) => (
                      <div key={backup.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{backup.filename}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(backup.startedAt)} • {(backup.sizeBytes / 1024 / 1024).toFixed(2)} MB
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Status: {backup.status} • Records: {backup.recordCount || 'N/A'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {backup.status === 'COMPLETED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm('Are you sure you want to restore this backup? This will replace the current database.')) {
                                    restoreBackupMutation.mutate(backup.id);
                                  }
                                }}
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scheduled Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scheduled Reports</CardTitle>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scheduledReports.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">No scheduled reports</p>
                    <Button onClick={openCreateDialog} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Report
                    </Button>
                  </div>
                ) : (
                  scheduledReports.map((report: any) => {
                    const recipients = JSON.parse(report.recipients || '[]');
                    return (
                      <div key={report.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="font-medium">{report.name}</div>
                              <Badge variant={report.enabled ? 'default' : 'secondary'}>
                                {report.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>Type: {report.reportType} • Frequency: {report.frequency}</div>
                              {report.frequency === 'WEEKLY' && report.dayOfWeek !== null && (
                                <div>
                                  Day: {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][report.dayOfWeek]}
                                </div>
                              )}
                              {report.frequency === 'MONTHLY' && report.dayOfMonth !== null && (
                                <div>Day of Month: {report.dayOfMonth}</div>
                              )}
                              <div>Recipients: {recipients.join(', ')}</div>
                              <div>Next run: {formatDate(report.nextRun)}</div>
                              {report.lastRun && (
                                <div>Last run: {formatDate(report.lastRun)}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runReportMutation.mutate(report.id)}
                              disabled={runReportMutation.isPending}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Run Now
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(report)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this scheduled report?')) {
                                  deleteReportMutation.mutate(report.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Create/Edit Report Dialog */}
          <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingReport ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
                </DialogTitle>
                <DialogDescription>
                  Configure automated report delivery schedule
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name *</Label>
                  <Input
                    id="report-name"
                    value={reportForm.name}
                    onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })}
                    placeholder="Daily Analytics Report"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type *</Label>
                  <Select
                    value={reportForm.reportType}
                    onValueChange={(value) => setReportForm({ ...reportForm, reportType: value })}
                  >
                    <SelectTrigger id="report-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANALYTICS">Analytics</SelectItem>
                      <SelectItem value="PERFORMANCE">Performance</SelectItem>
                      <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={reportForm.frequency}
                    onValueChange={(value) => setReportForm({ ...reportForm, frequency: value })}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {reportForm.frequency === 'WEEKLY' && (
                  <div className="space-y-2">
                    <Label htmlFor="day-of-week">Day of Week *</Label>
                    <Select
                      value={reportForm.dayOfWeek.toString()}
                      onValueChange={(value) => setReportForm({ ...reportForm, dayOfWeek: parseInt(value) })}
                    >
                      <SelectTrigger id="day-of-week">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {reportForm.frequency === 'MONTHLY' && (
                  <div className="space-y-2">
                    <Label htmlFor="day-of-month">Day of Month *</Label>
                    <Input
                      id="day-of-month"
                      type="number"
                      min="1"
                      max="31"
                      value={reportForm.dayOfMonth}
                      onChange={(e) => setReportForm({ ...reportForm, dayOfMonth: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="recipients"
                      type="email"
                      value={newRecipientEmail}
                      onChange={(e) => setNewRecipientEmail(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRecipient();
                        }
                      }}
                      placeholder="email@example.com"
                    />
                    <Button type="button" onClick={handleAddRecipient} variant="outline">
                      Add
                    </Button>
                  </div>
                  {reportForm.recipients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {reportForm.recipients.map((email) => (
                        <Badge key={email} variant="secondary" className="flex items-center gap-1">
                          {email}
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(email)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Add email addresses that will receive this report
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enabled"
                    checked={reportForm.enabled}
                    onCheckedChange={(checked) => setReportForm({ ...reportForm, enabled: checked as boolean })}
                  />
                  <Label htmlFor="enabled" className="cursor-pointer">
                    Enable this scheduled report
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setReportDialogOpen(false);
                  resetReportForm();
                }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReport}
                  disabled={createReportMutation.isPending || updateReportMutation.isPending}
                >
                  {editingReport ? 'Update' : 'Create'} Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
