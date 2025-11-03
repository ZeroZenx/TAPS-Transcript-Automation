import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { requestsApi, settingsApi } from '../services/api';
import { useToast } from './ui/use-toast';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, FileText, Send } from 'lucide-react';

interface VerifierFormViewProps {
  request: any;
  requestId: string;
}

export function VerifierFormView({ request, requestId }: VerifierFormViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for tabs
  const [activeTab, setActiveTab] = useState<'details' | 'verifier'>('details');

  // State for Verifier fields
  const [academicHistory, setAcademicHistory] = useState('');
  const [responsibleDeptForAcademicIssues, setResponsibleDeptForAcademicIssues] = useState('');
  const [academicVerifierComments, setAcademicVerifierComments] = useState('');
  const [academicCorrectionAddressed, setAcademicCorrectionAddressed] = useState('');
  const [academicCorrectionComments, setAcademicCorrectionComments] = useState('');
  
  // State for Request Details fields
  const [gpaRecalculation, setGpaRecalculation] = useState('');
  const [changeOfProgramme, setChangeOfProgramme] = useState('');
  const [degreeToBeAwarded, setDegreeToBeAwarded] = useState('');
  const [inProgressCoursesForPriorSemester, setInProgressCoursesForPriorSemester] = useState('');
  const [transcriptTemplateIssue, setTranscriptTemplateIssue] = useState('');
  const [addressFormat, setAddressFormat] = useState('');
  const [other, setOther] = useState('');
  
  // State for attachments
  const [attachments, setAttachments] = useState<any[]>([]);
  
  // State for conversation panel
  const [message, setMessage] = useState('');
  const [sentTo, setSentTo] = useState('');

  // Load initial values when request changes
  useEffect(() => {
    if (request) {
      setAcademicHistory(request.academicHistory || request.academicStatus || '');
      setResponsibleDeptForAcademicIssues(request.responsibleDeptForAcademicIssues || '');
      setAcademicVerifierComments(request.academicVerifierComments || '');
      setAcademicCorrectionAddressed(request.academicCorrectionAddressed || '');
      setAcademicCorrectionComments(request.academicCorrectionComments || '');
      
      setGpaRecalculation(request.gpaRecalculation || '');
      setChangeOfProgramme(request.changeOfProgramme || '');
      setDegreeToBeAwarded(request.degreeToBeAwarded || '');
      setInProgressCoursesForPriorSemester(request.inProgressCoursesForPriorSemester || '');
      setTranscriptTemplateIssue(request.transcriptTemplateIssue || '');
      setAddressFormat(request.addressFormat || '');
      setOther(request.other || '');
      
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

  const handleNoErrors = () => {
    updateMutation.mutate({
      status: 'APPROVED',
      academicVerifierComments: academicVerifierComments || null,
    });
  };

  const handleCorrectionsRequired = () => {
    updateMutation.mutate({
      status: 'IN_REVIEW',
      academicVerifierComments: academicVerifierComments || null,
      academicCorrectionAddressed: 'No',
    });
  };

  const handleUpdate = () => {
    const updates: any = {
      academicHistory: academicHistory || null,
      academicStatus: academicHistory || null,
      responsibleDeptForAcademicIssues: responsibleDeptForAcademicIssues || null,
      academicVerifierComments: academicVerifierComments || null,
      academicCorrectionAddressed: academicCorrectionAddressed || null,
      academicCorrectionComments: academicCorrectionComments || null,
      gpaRecalculation: gpaRecalculation || null,
      changeOfProgramme: changeOfProgramme || null,
      degreeToBeAwarded: degreeToBeAwarded || null,
      inProgressCoursesForPriorSemester: inProgressCoursesForPriorSemester || null,
      transcriptTemplateIssue: transcriptTemplateIssue || null,
      addressFormat: addressFormat || null,
      other: other || null,
    };

    updateMutation.mutate(updates);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const sendMessageMutation = useMutation({
    mutationFn: ({ requestId, message, recipient }: { requestId: string; message: string; recipient: string }) =>
      settingsApi.sendMessage(requestId, message, recipient),
    onSuccess: (data: any) => {
      toast({
        title: 'Message Sent',
        description: `Your message has been sent to ${data.data?.recipientEmail || 'the recipient'}`,
      });
      setMessage('');
      setSentTo('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    if (!sentTo) {
      toast({
        title: 'Validation Error',
        description: 'Please select a recipient',
        variant: 'destructive',
      });
      return;
    }

    sendMessageMutation.mutate({
      requestId,
      message,
      recipient: sentTo,
    });
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
    // TODO: Update request with new attachments
  };

  const academicHistoryOptions = ['In complete', 'Completed', 'Pending', 'Outstanding', 'Hold'];
  const responsibleDeptOptions = ['Library', 'Office of Bursar', 'Academic Department'];
  const academicCorrectionAddressedOptions = ['Yes', 'No', 'In Progress', 'Pending Review'];

  return (
    <div className="space-y-6">
      {/* Form Title */}
      <div className="bg-black text-white px-6 py-4 rounded-t-md">
        <h2 className="text-xl font-bold">Transcript Form for Academic Completeness Verification</h2>
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
          onClick={() => setActiveTab('verifier')}
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'verifier'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Verifier Action
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
                    <label className="text-sm font-medium">Requestor</label>
                    <Input
                      value={request.requestor || ''}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email Address</label>
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

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleNoErrors}
                    disabled={updateMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                  >
                    No Errors
                  </Button>
                  <Button
                    onClick={handleCorrectionsRequired}
                    disabled={updateMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                  >
                    Corrections Required
                  </Button>
                  <Button
                    onClick={handleUpdate}
                    disabled={updateMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                  >
                    Update
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600 flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Verifier Action Tab */}
          {activeTab === 'verifier' && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Academic History */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Academic History
                  </label>
                  <select
                    value={academicHistory}
                    onChange={(e) => setAcademicHistory(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Find items</option>
                    {academicHistoryOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Responsible Dept for Academic Issues */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Responsible Dept for Academic Issues
                  </label>
                  <select
                    value={responsibleDeptForAcademicIssues}
                    onChange={(e) => setResponsibleDeptForAcademicIssues(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Find items</option>
                    {responsibleDeptOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Academic Verifier Comments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Academic Verifier Comments
                  </label>
                  <textarea
                    value={academicVerifierComments}
                    onChange={(e) => setAcademicVerifierComments(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
                    placeholder="Enter academic verifier comments..."
                  />
                </div>

                {/* Academic Correction Addressed */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Academic Correction Addressed
                  </label>
                  <select
                    value={academicCorrectionAddressed}
                    onChange={(e) => setAcademicCorrectionAddressed(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Find items</option>
                    {academicCorrectionAddressedOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Academic Correction Comments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Academic Correction Comments
                  </label>
                  <textarea
                    value={academicCorrectionComments}
                    onChange={(e) => setAcademicCorrectionComments(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
                    placeholder="Enter academic correction comments..."
                  />
                </div>

                {/* Attachments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Attachments
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
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleNoErrors}
                    disabled={updateMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                  >
                    No Errors
                  </Button>
                  <Button
                    onClick={handleCorrectionsRequired}
                    disabled={updateMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                  >
                    Corrections Required
                  </Button>
                  <Button
                    onClick={handleUpdate}
                    disabled={updateMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                  >
                    Update
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600 flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Conversation Panel - Right */}
        <div className="space-y-6">
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
                    <option value="library">Library Dept</option>
                    <option value="bursar">Bursar</option>
                    <option value="academic">Academic Dept</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
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

