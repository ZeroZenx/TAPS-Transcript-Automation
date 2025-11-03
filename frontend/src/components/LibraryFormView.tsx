import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../services/api';
import { useToast } from './ui/use-toast';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, FileText, Send } from 'lucide-react';

interface LibraryFormViewProps {
  request: any;
  requestId: string;
}

export function LibraryFormView({ request, requestId }: LibraryFormViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for tabs
  const [activeTab, setActiveTab] = useState<'details' | 'library'>('library');

  // State for Library fields
  const [libraryStatus, setLibraryStatus] = useState('');
  const [libraryDeptDueAmount, setLibraryDeptDueAmount] = useState('');
  const [libraryDeptDueDetails, setLibraryDeptDueDetails] = useState('');
  const [libraryComments, setLibraryComments] = useState('');
  
  // State for attachments
  const [attachments, setAttachments] = useState<any[]>([]);
  
  // State for conversation panel
  const [message, setMessage] = useState('');
  const [sentTo, setSentTo] = useState('');

  // Load initial values when request changes
  useEffect(() => {
    if (request) {
      setLibraryStatus(request.libraryStatus || '');
      setLibraryDeptDueAmount(request.libraryDeptDueAmount || '');
      setLibraryDeptDueDetails(request.libraryDeptDueDetails || '');
      setLibraryComments(request.libraryNote || request.libraryComments || '');
      
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
    const updates: any = {
      libraryStatus: libraryStatus || null,
      libraryDeptDueAmount: libraryDeptDueAmount || null,
      libraryDeptDueDetails: libraryDeptDueDetails || null,
      libraryNote: libraryComments || null,
    };

    updateMutation.mutate(updates);
  };

  const handleCancel = () => {
    navigate(-1);
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

  const libraryStatusOptions = ['Approved', 'Pending', 'Awaiting Payment'];

  return (
    <div className="space-y-6">
      {/* Form Title */}
      <div className="bg-black text-white px-6 py-4 rounded-t-md">
        <h2 className="text-xl font-bold">Transcript Form for Library Due Verification</h2>
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
          onClick={() => setActiveTab('library')}
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'library'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Library Dept Action
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form - Left and Center */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'library' && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Library Dept Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Library Dept Status
                  </label>
                  <select
                    value={libraryStatus}
                    onChange={(e) => setLibraryStatus(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Find items</option>
                    {libraryStatusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Library Dept Due Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Library Dept Due Amount
                  </label>
                  <Input
                    type="text"
                    value={libraryDeptDueAmount}
                    onChange={(e) => setLibraryDeptDueAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>

                {/* Library Dept Due Details */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Library Dept Due Details
                  </label>
                  <Input
                    type="text"
                    value={libraryDeptDueDetails}
                    onChange={(e) => setLibraryDeptDueDetails(e.target.value)}
                    placeholder="Enter due details"
                  />
                </div>

                {/* Library Dept Comments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Library Dept Comments
                  </label>
                  <textarea
                    value={libraryComments}
                    onChange={(e) => setLibraryComments(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
                    placeholder="Enter comments..."
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

                {/* Submit and Cancel Buttons */}
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
                    Cancel
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

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Bursar's Confirmation on Due */}
          <Card>
            <CardContent className="pt-6">
              <div className="bg-orange-600 text-white px-4 py-3 rounded">
                <h3 className="font-semibold">Bursar's Confirmation on Due</h3>
                <p className="text-sm mt-2 opacity-90">
                  {request.bursarsConfirmationForLibraryDuePayment || 'Pending confirmation'}
                </p>
              </div>
            </CardContent>
          </Card>

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
                    Select
                  </label>
                  <select
                    value={sentTo}
                    onChange={(e) => setSentTo(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select recipient</option>
                    <option value="student">Student</option>
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

