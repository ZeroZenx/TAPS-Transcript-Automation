import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { requestsApi } from '../services/api';
import { useToast } from '../components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Upload, X, FileText } from 'lucide-react';

const requestSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  studentEmail: z.string().email('Valid email is required'),
  requestor: z.string().min(1, 'Requestor is required'),
  parchmentCode: z.string().min(1, 'Parchment Code is required'),
  requestDate: z.string().min(1, 'Date of Request is required'),
  notes: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

const ALLOWED_FILE_TYPES = ['.pdf', '.jpg', '.jpeg', '.png', '.docx'];
const MAX_FILES = 10;

export function NewRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);

  // Generate Request ID (8-digit format)
  const generateRequestId = () => {
    const timestamp = Date.now();
    return timestamp.toString().slice(-8);
  };

  const [requestId] = useState(generateRequestId());

  const { register, handleSubmit, formState: { errors } } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      studentEmail: user?.email || '',
      requestor: user?.name || '',
      requestDate: (() => {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const year = today.getFullYear();
        return `${month}/${day}/${year}`;
      })(),
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      // Convert files to base64
      const filePromises = files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        return {
          name: file.name,
          content: base64,
          type: file.type,
        };
      });

      const fileData = await Promise.all(filePromises);

      // Convert MM/DD/YYYY to ISO date string
      const parseDate = (dateStr: string) => {
        const [month, day, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
      };

      return requestsApi.create({
        ...data,
        requestDate: parseDate(data.requestDate),
        files: fileData,
      });
    },
    onSuccess: (response) => {
      toast({
        title: 'Success',
        description: 'Request submitted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      // Redirect to request detail view
      const requestId = response.data?.request?.id;
      if (requestId) {
        navigate(`/requests/${requestId}`);
      } else {
        navigate('/requests/my');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to submit request',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RequestFormData) => {
    mutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Validate file types
      const invalidFiles = newFiles.filter(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return !ALLOWED_FILE_TYPES.includes(ext);
      });

      if (invalidFiles.length > 0) {
        toast({
          title: 'Invalid File Type',
          description: `Only PDF, JPG, PNG, and DOCX files are allowed`,
          variant: 'destructive',
        });
        return;
      }

      // Check total file count
      if (files.length + newFiles.length > MAX_FILES) {
        toast({
          title: 'Too Many Files',
          description: `Maximum ${MAX_FILES} files allowed`,
          variant: 'destructive',
        });
        return;
      }

      setFiles([...files, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="bg-orange-600 text-white px-6 py-3 rounded-t-md">
        <h1 className="text-2xl font-bold">New Transcript Request</h1>
      </div>
      <div>
        <p className="text-muted-foreground mt-2">
          Complete the form below to submit a new transcript request
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Form */}
        <Card>
          <CardHeader>
            <CardTitle>Request Information</CardTitle>
            <CardDescription>Please fill in all required fields</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="requestId" className="text-sm font-medium">
                  Request ID
                </label>
                <Input
                  id="requestId"
                  value={requestId}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-generated request ID
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="studentId" className="text-sm font-medium">
                  Student ID *
                </label>
                <Input
                  id="studentId"
                  {...register('studentId')}
                  placeholder="Enter student ID"
                />
                {errors.studentId && (
                  <p className="text-sm text-destructive">{errors.studentId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="requestDate" className="text-sm font-medium">
                  Date of Request *
                </label>
                <div className="relative">
                  <Input
                    id="requestDate"
                    type="text"
                    {...register('requestDate')}
                    placeholder="MM/DD/YYYY"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    📅
                  </span>
                </div>
                {errors.requestDate && (
                  <p className="text-sm text-destructive">{errors.requestDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="parchmentCode" className="text-sm font-medium">
                  Parchment Code *
                </label>
                <Input
                  id="parchmentCode"
                  {...register('parchmentCode')}
                  placeholder="Enter parchment code"
                />
                {errors.parchmentCode && (
                  <p className="text-sm text-destructive">{errors.parchmentCode.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="requestor" className="text-sm font-medium">
                  Requestor *
                </label>
                <Input
                  id="requestor"
                  {...register('requestor')}
                  placeholder="Enter requestor name"
                />
                {errors.requestor && (
                  <p className="text-sm text-destructive">{errors.requestor.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="studentEmail" className="text-sm font-medium">
                  Email Address *
                </label>
                <Input
                  id="studentEmail"
                  type="email"
                  {...register('studentEmail')}
                  placeholder="Enter email address"
                />
                {errors.studentEmail && (
                  <p className="text-sm text-destructive">{errors.studentEmail.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Add any additional notes or information..."
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
            <CardDescription>
              Upload supporting documents (PDF, JPG, PNG, DOCX) - Maximum {MAX_FILES} files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-input rounded-md cursor-pointer hover:bg-accent transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span className="text-sm font-medium">Attach file</span>
              </label>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                onChange={handleFileChange}
                className="hidden"
                disabled={files.length >= MAX_FILES}
              />
              {files.length >= MAX_FILES && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Maximum {MAX_FILES} files reached
                </p>
              )}
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Uploaded Files ({files.length})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">There is nothing attached.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
