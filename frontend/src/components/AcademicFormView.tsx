import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { requestsApi, settingsApi } from '../services/api';
import { useToast } from './ui/use-toast';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, FileText, Send } from 'lucide-react';

interface AcademicFormViewProps {
  request: any;
  requestId: string;
}

export function AcademicFormView({ request, requestId }: AcademicFormViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for tabs
  const [activeTab, setActiveTab] = useState<'details' | 'academic'>('academic');

  // State for Academic fields
  const [academicStatus, setAcademicStatus] = useState('');
  const [responsibleDeptForAcademicIssues, setResponsibleDeptForAcademicIssues] = useState('');
  const [academicVerifierComments, setAcademicVerifierComments] = useState('');
  const [academicCorrectionAddressed, setAcademicCorrectionAddressed] = useState('');
  const [academicCorrectionComments, setAcademicCorrectionComments] = useState('');
  
  // State for attachments
  const [attachments, setAttachments] = useState<any[]>([]);
  
  // State for conversation panel
  const [message, setMessage] = useState('');
  const [sentTo, setSentTo] = useState('');

  // Load initial values when request changes
  useEffect(() => {
    if (request) {
      // Academic History can come from academicStatus or academicHistory field
      setAcademicStatus(request.academicHistory || request.academicStatus || '');
      setResponsibleDeptForAcademicIssues(request.responsibleDeptForAcademicIssues || '');
      setAcademicVerifierComments(request.academicVerifierComments || '');
      setAcademicCorrectionAddressed(request.academicCorrectionAddressed || '');
      setAcademicCorrectionComments(request.academicCorrectionComments || '');
      
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

  const handleSubmit = () => {
    // Validate required fields
    if (!academicCorrectionAddressed) {
      toast({
        title: 'Validation Error',
        description: 'Academic Correction Addressed is required',
        variant: 'destructive',
      });
      return;
    }

    const updates: any = {
      academicHistory: academicStatus || null, // Map to academicHistory field
      academicStatus: academicStatus || null, // Also update academicStatus for compatibility
      responsibleDeptForAcademicIssues: responsibleDeptForAcademicIssues || null,
      academicVerifierComments: academicVerifierComments || null,
      academicCorrectionAddressed: academicCorrectionAddressed,
      academicCorrectionComments: academicCorrectionComments || null,
      academicNote: academicVerifierComments || null, // Also update academicNote for compatibility
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
        <h2 className="text-xl font-bold">Transcript form to address academic corrections.</h2>
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
          Academic Dept Action
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form - Left and Center */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'academic' && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Academic History */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Academic History
                  </label>
                  <select
                    value={academicStatus}
                    onChange={(e) => setAcademicStatus(e.target.value)}
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
                    Academic Correction Addressed <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={academicCorrectionAddressed}
                    onChange={(e) => setAcademicCorrectionAddressed(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
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

                {/* Submit and Back Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={updateMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {updateMutation.isPending ? 'Submitting...' : 'Submit'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                  >
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Request Details Tab */}
          {activeTab === 'details' && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Student ID</p>
                    <p className="font-medium">{request.studentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Student Email</p>
                    <p className="font-medium">{request.studentEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Request ID</p>
                    <p className="font-medium">{request.requestId || request.id.substring(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Request</p>
                    <p className="font-medium">{new Date(request.requestDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Program</p>
                    <p className="font-medium">{request.program || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requestor</p>
                    <p className="font-medium">{request.requestor || 'N/A'}</p>
                  </div>
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

