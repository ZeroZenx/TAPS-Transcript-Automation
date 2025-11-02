import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { requestsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatDate } from '../lib/utils';
import { AuditTimeline } from '../components/AuditTimeline';
import { ArrowLeft, FileText, Download, Upload } from 'lucide-react';

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const role = user?.role || 'STUDENT';

  const { data, isLoading } = useQuery({
    queryKey: ['requests', id],
    queryFn: () => requestsApi.getById(id!),
  });

  const request = data?.data?.request;
  const auditLogs = request?.auditLogs || [];

  // Department status options
  const libraryStatusOptions = ['Clear', 'Hold', 'Issue'];
  const bursarStatusOptions = ['Paid', 'Owing', 'Waived', 'Hold'];
  const academicStatusOptions = ['Good Standing', 'Outstanding', 'Hold'];

  const [verifierNotes, setVerifierNotes] = useState('');
  const [libraryStatus, setLibraryStatus] = useState('');
  const [libraryNote, setLibraryNote] = useState('');
  const [bursarStatus, setBursarStatus] = useState('');
  const [bursarNote, setBursarNote] = useState('');
  const [academicStatus, setAcademicStatus] = useState('');
  const [academicNote, setAcademicNote] = useState('');
  const [processorNotes, setProcessorNotes] = useState('');

  // Update state when request data loads
  useEffect(() => {
    if (request) {
      setVerifierNotes(request.verifierNotes || '');
      setLibraryStatus(request.libraryStatus || '');
      setLibraryNote(request.libraryNote || '');
      setBursarStatus(request.bursarStatus || '');
      setBursarNote(request.bursarNote || '');
      setAcademicStatus(request.academicStatus || '');
      setAcademicNote(request.academicNote || '');
      setProcessorNotes(request.processorNotes || '');
    }
  }, [request]);

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      return requestsApi.update(id!, updates);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Request updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['requests', id] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update request',
        variant: 'destructive',
      });
    },
  });

  const handleStatusChange = (status: string) => {
    const updates: any = { status };
    if (role === 'VERIFIER' && verifierNotes) {
      updates.verifierNotes = verifierNotes;
    }
    updateMutation.mutate(updates);
  };

  const handleDeptStatusChange = (dept: 'library' | 'bursar' | 'academic') => {
    const status = dept === 'library' ? libraryStatus : dept === 'bursar' ? bursarStatus : academicStatus;
    const note = dept === 'library' ? libraryNote : dept === 'bursar' ? bursarNote : academicNote;
    
    const statusField = dept === 'library' ? 'libraryStatus' : dept === 'bursar' ? 'bursarStatus' : 'academicStatus';
    
    const updates: any = {
      [statusField]: status,
    };

    // Require note for certain statuses
    const requiresNote = 
      (dept === 'library' && ['Hold', 'Issue'].includes(status)) ||
      (dept === 'bursar' && ['Owing', 'Hold'].includes(status)) ||
      (dept === 'academic' && ['Outstanding', 'Hold'].includes(status));

    if (requiresNote && !note) {
      toast({
        title: 'Note Required',
        description: `A note is required for status: ${status}`,
        variant: 'destructive',
      });
      return;
    }

    // Include note in update if provided
    if (note) {
      updates.notes = note;
    }

    updateMutation.mutate(updates);
    
    // Clear the note field after submission
    if (dept === 'library') setLibraryNote('');
    if (dept === 'bursar') setBursarNote('');
    if (dept === 'academic') setAcademicNote('');
  };

  const handleSaveNotes = () => {
    updateMutation.mutate({ verifierNotes });
  };

  const handleComplete = () => {
    updateMutation.mutate({
      status: 'COMPLETED',
      processorNotes,
    });
  };

  const canApprove = () => {
    if (!request) return false;
    // Cannot approve if any dept has Hold, Issue, or Owing
    const hasIssue = 
      request.libraryStatus === 'Hold' || request.libraryStatus === 'Issue' ||
      request.bursarStatus === 'Hold' || request.bursarStatus === 'Owing' ||
      request.academicStatus === 'Hold' || request.academicStatus === 'Outstanding';
    return !hasIssue;
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

  const getDeptStatusBadge = (status: string) => {
    if (!status || status === 'PENDING') return <Badge variant="warning">Pending</Badge>;
    if (['Hold', 'Issue', 'Owing', 'Outstanding'].includes(status)) {
      return <Badge variant="warning">{status}</Badge>;
    }
    return <Badge variant="success">{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Request not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const files = request.filesUrl ? (typeof request.filesUrl === 'string' ? JSON.parse(request.filesUrl) : request.filesUrl) : [];

  // Determine if this is read-only (Student view) or editable
  const isReadOnly = role === 'STUDENT';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold mt-4">Request Details</h1>
          <p className="text-muted-foreground mt-2">Request ID: {request.id.substring(0, 8)}...</p>
        </div>
        <Badge variant={getStatusBadgeVariant(request.status)}>
          {request.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Request Info & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Information */}
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student Name</p>
                  <p className="font-medium">{request.user?.name || request.studentEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student Email</p>
                  <p className="font-medium">{request.studentEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student ID</p>
                  <p className="font-medium">{request.studentId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Program</p>
                  <p className="font-medium">{request.program}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted Date</p>
                  <p className="font-medium">{formatDate(request.requestDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{formatDate(request.lastUpdated || request.requestDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Department Status Blocks */}
          {!isReadOnly && (
            <Card>
              <CardHeader>
                <CardTitle>Department Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Library Status */}
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Library</h4>
                    {role === 'LIBRARY' ? (
                      <div className="flex gap-2">
                        <select
                          value={libraryStatus}
                          onChange={(e) => setLibraryStatus(e.target.value)}
                          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        >
                          <option value="">Select status</option>
                          {libraryStatusOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleDeptStatusChange('library')}
                          disabled={!libraryStatus}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      getDeptStatusBadge(request.libraryStatus || 'PENDING')
                    )}
                  </div>
                  {role === 'LIBRARY' && (libraryStatus === 'Hold' || libraryStatus === 'Issue') && (
                    <div className="mt-2">
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                        placeholder="Note (required)"
                        value={libraryNote}
                        onChange={(e) => setLibraryNote(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  {request.libraryStatus && role !== 'LIBRARY' && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">Status: {request.libraryStatus}</p>
                      {request.libraryNote && (
                        <p className="text-sm text-muted-foreground mt-1">Note: {request.libraryNote}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bursar Status */}
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Bursar</h4>
                    {role === 'BURSAR' ? (
                      <div className="flex gap-2">
                        <select
                          value={bursarStatus}
                          onChange={(e) => setBursarStatus(e.target.value)}
                          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        >
                          <option value="">Select status</option>
                          {bursarStatusOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleDeptStatusChange('bursar')}
                          disabled={!bursarStatus}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      getDeptStatusBadge(request.bursarStatus || 'PENDING')
                    )}
                  </div>
                  {role === 'BURSAR' && (bursarStatus === 'Owing' || bursarStatus === 'Hold') && (
                    <div className="mt-2">
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                        placeholder="Note (required)"
                        value={bursarNote}
                        onChange={(e) => setBursarNote(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  {request.bursarStatus && role !== 'BURSAR' && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">Status: {request.bursarStatus}</p>
                      {request.bursarNote && (
                        <p className="text-sm text-muted-foreground mt-1">Note: {request.bursarNote}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Academic Status */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Academic</h4>
                    {role === 'ACADEMIC' ? (
                      <div className="flex gap-2">
                        <select
                          value={academicStatus}
                          onChange={(e) => setAcademicStatus(e.target.value)}
                          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        >
                          <option value="">Select status</option>
                          {academicStatusOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleDeptStatusChange('academic')}
                          disabled={!academicStatus}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      getDeptStatusBadge(request.academicStatus || 'PENDING')
                    )}
                  </div>
                  {role === 'ACADEMIC' && (academicStatus === 'Outstanding' || academicStatus === 'Hold') && (
                    <div className="mt-2">
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                        placeholder="Note (required)"
                        value={academicNote}
                        onChange={(e) => setAcademicNote(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  {request.academicStatus && role !== 'ACADEMIC' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Status: {request.academicStatus}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Read-only Department Status (Student view) */}
          {isReadOnly && (
            <Card>
              <CardHeader>
                <CardTitle>Department Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Library</p>
                  {getDeptStatusBadge(request.libraryStatus || 'PENDING')}
                  {request.libraryNote && (
                    <p className="text-sm text-muted-foreground mt-2">Note: {request.libraryNote}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bursar</p>
                  {getDeptStatusBadge(request.bursarStatus || 'PENDING')}
                  {request.bursarNote && (
                    <p className="text-sm text-muted-foreground mt-2">Note: {request.bursarNote}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Academic</p>
                  {getDeptStatusBadge(request.academicStatus || 'PENDING')}
                  {request.academicNote && (
                    <p className="text-sm text-muted-foreground mt-2">Note: {request.academicNote}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Verifier Notes */}
          {role === 'VERIFIER' && (
            <Card>
              <CardHeader>
                <CardTitle>Verifier Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                  value={verifierNotes}
                  onChange={(e) => setVerifierNotes(e.target.value)}
                  placeholder="Add verification notes..."
                />
                <Button
                  onClick={handleSaveNotes}
                  disabled={updateMutation.isPending}
                >
                  Save Notes
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Processor Notes & Actions */}
          {role === 'PROCESSOR' && (
            <Card>
              <CardHeader>
                <CardTitle>Processing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Processor Notes</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] mt-2"
                    value={processorNotes}
                    onChange={(e) => setProcessorNotes(e.target.value)}
                    placeholder="Add processing notes..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Upload Final Transcript</label>
                  <Button variant="outline" className="mt-2">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PDF
                  </Button>
                </div>
                <Button
                  onClick={handleComplete}
                  disabled={updateMutation.isPending}
                  className="w-full"
                >
                  Mark Completed
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons (Verifier) */}
          {role === 'VERIFIER' && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('IN_REVIEW')}
                  disabled={updateMutation.isPending}
                  className="w-full"
                >
                  Mark In Review
                </Button>
                <Button
                  onClick={() => handleStatusChange('APPROVED')}
                  disabled={updateMutation.isPending || !canApprove()}
                  className="w-full"
                  title={!canApprove() ? 'Cannot approve while departments have issues' : ''}
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleStatusChange('REJECTED')}
                  disabled={updateMutation.isPending}
                  className="w-full"
                >
                  Reject
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Files & Timeline */}
        <div className="space-y-6">
          {/* Files */}
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files uploaded</p>
              ) : (
                <div className="space-y-2">
                  {Array.isArray(files) ? files.map((file: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => {
                        if (file.url) window.open(file.url, '_blank');
                      }}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{file.name || file}</span>
                      {file.url && (
                        <Download className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )) : (
                    <p className="text-sm">{files}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline logs={auditLogs} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
