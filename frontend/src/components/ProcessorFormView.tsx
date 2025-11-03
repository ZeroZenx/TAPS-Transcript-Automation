import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../services/api';
import { useToast } from './ui/use-toast';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { X, FileText, Send, Building2, BookOpen, DollarSign } from 'lucide-react';

interface ProcessorFormViewProps {
  request: any;
  requestId: string;
}

export function ProcessorFormView({ request, requestId }: ProcessorFormViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for tabs
  const [activeTab, setActiveTab] = useState<'details' | 'academic' | 'library' | 'bursar'>('details');

  // State for Request Details fields
  const [gpaRecalculation, setGpaRecalculation] = useState('');
  const [changeOfProgramme, setChangeOfProgramme] = useState('');
  const [degreeToBeAwarded, setDegreeToBeAwarded] = useState('');
  const [inProgressCoursesForPriorSemester, setInProgressCoursesForPriorSemester] = useState('');
  const [transcriptTemplateIssue, setTranscriptTemplateIssue] = useState('');
  const [addressFormat, setAddressFormat] = useState('');
  const [other, setOther] = useState('');
  const [processorNotes, setProcessorNotes] = useState('');
  
  // State for attachments
  const [attachments, setAttachments] = useState<any[]>([]);
  
  // State for conversation panel
  const [message, setMessage] = useState('');
  const [sentTo, setSentTo] = useState('');

  // Load initial values when request changes
  useEffect(() => {
    if (request) {
      setGpaRecalculation(request.gpaRecalculation || '');
      setChangeOfProgramme(request.changeOfProgramme || '');
      setDegreeToBeAwarded(request.degreeToBeAwarded || '');
      setInProgressCoursesForPriorSemester(request.inProgressCoursesForPriorSemester || '');
      setTranscriptTemplateIssue(request.transcriptTemplateIssue || '');
      setAddressFormat(request.addressFormat || '');
      setOther(request.other || '');
      setProcessorNotes(request.processorNotes || '');
      
      // Parse files
      const files = request.filesUrl ? (typeof request.filesUrl === 'string' ? JSON.parse(request.filesUrl) : request.filesUrl) : [];
      setAttachments(Array.isArray(files) ? files : []);
    }
  }, [request]);

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      return requestsApi.update(requestId, updates);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Request updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['requests', requestId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update request',
        variant: 'destructive',
      });
    },
  });

  const handleCancelRequest = () => {
    if (window.confirm('Are you sure you want to cancel this request?')) {
      updateMutation.mutate({ status: 'CANCELLED' });
    }
  };

  const handleTranscriptUploaded = () => {
    updateMutation.mutate({
      status: 'COMPLETED',
      processorNotes: processorNotes || 'Transcript uploaded',
    });
    toast({
      title: 'Success',
      description: 'Request marked as completed',
    });
  };

  const handleNoErrors = () => {
    updateMutation.mutate({
      status: 'APPROVED',
      processorNotes: processorNotes || 'No errors found',
    });
  };

  const handleCorrectionsRequired = () => {
    updateMutation.mutate({
      status: 'IN_REVIEW',
      processorNotes: processorNotes || 'Corrections required',
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleUpdate = () => {
    const updates: any = {
      gpaRecalculation: gpaRecalculation || null,
      changeOfProgramme: changeOfProgramme || null,
      degreeToBeAwarded: degreeToBeAwarded || null,
      inProgressCoursesForPriorSemester: inProgressCoursesForPriorSemester || null,
      transcriptTemplateIssue: transcriptTemplateIssue || null,
      addressFormat: addressFormat || null,
      other: other || null,
      processorNotes: processorNotes || null,
    };

    updateMutation.mutate(updates);
  };

  const handleSendMessage = () => {
    if (!message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    // TODO: Implement message sending functionality
    toast({
      title: 'Message Sent',
      description: 'Your message has been sent',
    });
    
    setMessage('');
    setSentTo('');
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
    // TODO: Update request with new attachments
  };

  // Get status badges
  const getStatusBadge = (status: string) => {
    if (!status || status === 'PENDING') {
      return <Badge variant="warning">Pending</Badge>;
    }
    if (['APPROVED', 'Completed', 'COMPLETED'].includes(status)) {
      return <Badge variant="success" className="bg-green-600">Completed</Badge>;
    }
    return <Badge variant="warning">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Academic History Status</p>
                <p className="font-semibold text-lg">
                  {getStatusBadge(request.academicStatus || request.academicHistory || 'Pending')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Library Dept Status</p>
                <p className="font-semibold text-lg">
                  {getStatusBadge(request.libraryStatus || 'Pending')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Bursar Dept Status</p>
                <p className="font-semibold text-lg">
                  {getStatusBadge(request.bursarStatus || 'Pending')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'details'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Request Details
        </button>
        <button
          onClick={() => setActiveTab('academic')}
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'academic'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Academic Checks
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'library'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Library Dept Checks
        </button>
        <button
          onClick={() => setActiveTab('bursar')}
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'bursar'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Bursar Dept Checks
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form - Left and Center */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details Tab */}
          {activeTab === 'details' && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Request ID</label>
                    <Input
                      value={request.requestId || request.id.substring(0, 8)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Parchment Code</label>
                    <Input
                      value={request.parchmentCode || ''}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Student ID</label>
                    <Input
                      value={request.studentId}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date of Request</label>
                    <Input
                      value={new Date(request.requestDate).toLocaleDateString()}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Requestor <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={request.requestor || ''}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={request.studentEmail}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">GPA Recalculation</label>
                    <Input
                      value={gpaRecalculation}
                      onChange={(e) => setGpaRecalculation(e.target.value)}
                      placeholder="Enter GPA recalculation"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Change of Programme</label>
                    <Input
                      value={changeOfProgramme}
                      onChange={(e) => setChangeOfProgramme(e.target.value)}
                      placeholder="Enter change of programme"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Degree to be Awarded</label>
                    <Input
                      value={degreeToBeAwarded}
                      onChange={(e) => setDegreeToBeAwarded(e.target.value)}
                      placeholder="Enter degree"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">InProgress courses for prior semester</label>
                    <Input
                      value={inProgressCoursesForPriorSemester}
                      onChange={(e) => setInProgressCoursesForPriorSemester(e.target.value)}
                      placeholder="Enter semester"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Transcript Template Issue</label>
                    <Input
                      value={transcriptTemplateIssue}
                      onChange={(e) => setTranscriptTemplateIssue(e.target.value)}
                      placeholder="Enter template issue"
                      className="bg-blue-50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Address Format</label>
                    <Input
                      value={addressFormat}
                      onChange={(e) => setAddressFormat(e.target.value)}
                      placeholder="Enter address format"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Other</label>
                    <Input
                      value={other}
                      onChange={(e) => setOther(e.target.value)}
                      placeholder="Enter other notes"
                    />
                  </div>
                </div>

                {/* Processor Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Processor Notes</label>
                  <textarea
                    value={processorNotes}
                    onChange={(e) => setProcessorNotes(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                    placeholder="Enter processor notes..."
                  />
                </div>

                {/* Attachments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    <span className="text-red-500">*</span> Attachments
                  </label>
                  <div className="space-y-2">
                    {attachments.map((file: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{file.name || file}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveAttachment(index)}
                          className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement file upload
                      toast({
                        title: 'File Upload',
                        description: 'File upload functionality coming soon',
                      });
                    }}
                  >
                    Attach file
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 flex-wrap">
                  <Button
                    onClick={handleCancelRequest}
                    disabled={updateMutation.isPending}
                    variant="destructive"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Cancel Request
                  </Button>
                  <Button
                    onClick={handleTranscriptUploaded}
                    disabled={updateMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Transcript Uploaded
                  </Button>
                  <Button
                    onClick={handleNoErrors}
                    disabled={updateMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    No Errors
                  </Button>
                  <Button
                    onClick={handleCorrectionsRequired}
                    disabled={updateMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Corrections Required
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                  >
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Academic Checks Tab */}
          {activeTab === 'academic' && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Academic History Status</p>
                  <p className="font-medium">{request.academicHistory || request.academicStatus || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Responsible Dept for Academic Issues</p>
                  <p className="font-medium">{request.responsibleDeptForAcademicIssues || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Academic Verifier Comments</p>
                  <p className="font-medium">{request.academicVerifierComments || 'No comments'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Academic Correction Addressed</p>
                  <p className="font-medium">{request.academicCorrectionAddressed || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Academic Correction Comments</p>
                  <p className="font-medium">{request.academicCorrectionComments || 'No comments'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Library Dept Checks Tab */}
          {activeTab === 'library' && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Library Dept Status</p>
                  <p className="font-medium">{request.libraryStatus || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Library Dept Due Amount</p>
                  <p className="font-medium">{request.libraryDeptDueAmount || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Library Dept Due Details</p>
                  <p className="font-medium">{request.libraryDeptDueDetails || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Library Dept Comments</p>
                  <p className="font-medium">{request.libraryNote || 'No comments'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bursar Dept Checks Tab */}
          {activeTab === 'bursar' && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bursar Status</p>
                  <p className="font-medium">{request.bursarStatus || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Office of Bursar Due Amount</p>
                  <p className="font-medium">{request.officeOfBursarDueAmount || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Office of Bursar Due Details</p>
                  <p className="font-medium">{request.officeOfBursarDueDetails || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bursar's Confirmation for Library Due Payment</p>
                  <p className="font-medium">{request.bursarsConfirmationForLibraryDuePayment || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bursar Comments</p>
                  <p className="font-medium">{request.bursarNote || 'No comments'}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Request ID & Status */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="bg-green-600 text-white px-4 py-3 rounded">
                  <p className="text-sm font-medium">Request ID</p>
                  <p className="text-lg font-bold">{request.requestId || request.id.substring(0, 8)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="bg-black text-white px-4 py-3 rounded">
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-lg font-bold">{request.status || 'Pending'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversation Panel */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">Conversation Panel</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Send a message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                    placeholder="Type your message..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Send to
                  </label>
                  <select
                    value={sentTo}
                    onChange={(e) => setSentTo(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select recipient</option>
                    <option value="student">Student</option>
                    <option value="library">Library Dept</option>
                    <option value="bursar">Bursar</option>
                    <option value="academic">Academic Dept</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <Button
                  onClick={handleSendMessage}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>

              {/* Conversation History */}
              <div className="mt-6 bg-gray-800 rounded p-4 min-h-[300px]">
                <p className="text-sm text-gray-400">Conversation history will appear here</p>
                {/* TODO: Display conversation history */}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

