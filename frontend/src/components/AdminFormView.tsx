import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { requestsApi } from '../services/api';
import { useToast } from './ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Building2, BookOpen, DollarSign, GraduationCap } from 'lucide-react';

interface AdminFormViewProps {
  request: any;
  requestId: string;
}

export function AdminFormView({ request, requestId }: AdminFormViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'library' | 'bursar' | 'details'>('overview');

  // State for all editable fields
  const [status, setStatus] = useState('');
  const [gpaRecalculation, setGpaRecalculation] = useState('');
  const [changeOfProgramme, setChangeOfProgramme] = useState('');
  const [degreeToBeAwarded, setDegreeToBeAwarded] = useState('');
  const [inProgressCoursesForPriorSemester, setInProgressCoursesForPriorSemester] = useState('');
  const [transcriptTemplateIssue, setTranscriptTemplateIssue] = useState('');
  const [addressFormat, setAddressFormat] = useState('');
  const [other, setOther] = useState('');

  // Academic fields
  const [academicStatus, setAcademicStatus] = useState('');
  const [responsibleDeptForAcademicIssues, setResponsibleDeptForAcademicIssues] = useState('');
  const [academicVerifierComments, setAcademicVerifierComments] = useState('');
  const [academicCorrectionAddressed, setAcademicCorrectionAddressed] = useState('');
  const [academicCorrectionComments, setAcademicCorrectionComments] = useState('');

  // Library fields
  const [libraryStatus, setLibraryStatus] = useState('');
  const [libraryDeptDueAmount, setLibraryDeptDueAmount] = useState('');
  const [libraryDeptDueDetails, setLibraryDeptDueDetails] = useState('');
  const [libraryComments, setLibraryComments] = useState('');

  // Bursar fields
  const [bursarStatus, setBursarStatus] = useState('');
  const [officeOfBursarDueAmount, setOfficeOfBursarDueAmount] = useState('');
  const [officeOfBursarDueDetails, setOfficeOfBursarDueDetails] = useState('');
  const [bursarsConfirmationForLibraryDuePayment, setBursarsConfirmationForLibraryDuePayment] = useState('');
  const [bursarComments, setBursarComments] = useState('');

  // Load initial values
  useEffect(() => {
    if (request) {
      setStatus(request.status || '');
      setGpaRecalculation(request.gpaRecalculation || '');
      setChangeOfProgramme(request.changeOfProgramme || '');
      setDegreeToBeAwarded(request.degreeToBeAwarded || '');
      setInProgressCoursesForPriorSemester(request.inProgressCoursesForPriorSemester || '');
      setTranscriptTemplateIssue(request.transcriptTemplateIssue || '');
      setAddressFormat(request.addressFormat || '');
      setOther(request.other || '');

      setAcademicStatus(request.academicHistory || request.academicStatus || '');
      setResponsibleDeptForAcademicIssues(request.responsibleDeptForAcademicIssues || '');
      setAcademicVerifierComments(request.academicVerifierComments || '');
      setAcademicCorrectionAddressed(request.academicCorrectionAddressed || '');
      setAcademicCorrectionComments(request.academicCorrectionComments || '');

      setLibraryStatus(request.libraryStatus || '');
      setLibraryDeptDueAmount(request.libraryDeptDueAmount || '');
      setLibraryDeptDueDetails(request.libraryDeptDueDetails || '');
      setLibraryComments(request.libraryNote || '');

      setBursarStatus(request.bursarStatus || '');
      setOfficeOfBursarDueAmount(request.officeOfBursarDueAmount || '');
      setOfficeOfBursarDueDetails(request.officeOfBursarDueDetails || '');
      setBursarsConfirmationForLibraryDuePayment(request.bursarsConfirmationForLibraryDuePayment || '');
      setBursarComments(request.bursarNote || '');
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

  const handleSave = () => {
    const updates: any = {
      status: status || null,
      gpaRecalculation: gpaRecalculation || null,
      changeOfProgramme: changeOfProgramme || null,
      degreeToBeAwarded: degreeToBeAwarded || null,
      inProgressCoursesForPriorSemester: inProgressCoursesForPriorSemester || null,
      transcriptTemplateIssue: transcriptTemplateIssue || null,
      addressFormat: addressFormat || null,
      other: other || null,
      academicHistory: academicStatus || null,
      academicStatus: academicStatus || null,
      responsibleDeptForAcademicIssues: responsibleDeptForAcademicIssues || null,
      academicVerifierComments: academicVerifierComments || null,
      academicCorrectionAddressed: academicCorrectionAddressed || null,
      academicCorrectionComments: academicCorrectionComments || null,
      libraryStatus: libraryStatus || null,
      libraryDeptDueAmount: libraryDeptDueAmount || null,
      libraryDeptDueDetails: libraryDeptDueDetails || null,
      libraryNote: libraryComments || null,
      bursarStatus: bursarStatus || null,
      officeOfBursarDueAmount: officeOfBursarDueAmount || null,
      officeOfBursarDueDetails: officeOfBursarDueDetails || null,
      bursarsConfirmationForLibraryDuePayment: bursarsConfirmationForLibraryDuePayment || null,
      bursarNote: bursarComments || null,
    };

    updateMutation.mutate(updates);
  };

  const getStatusBadge = (status: string) => {
    if (!status || status === 'PENDING') {
      return <Badge variant="warning">Pending</Badge>;
    }
    if (['APPROVED', 'Completed', 'COMPLETED'].includes(status)) {
      return <Badge className="bg-green-600">Completed</Badge>;
    }
    return <Badge variant="warning">{status}</Badge>;
  };

  const statusOptions = ['NEW', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
  const academicStatusOptions = ['In complete', 'Completed', 'Pending', 'Outstanding', 'Hold'];
  const libraryStatusOptions = ['Approved', 'Pending', 'Awaiting Payment'];
  const bursarStatusOptions = ['Approved', 'Pending', 'Awaiting Payment'];
  const responsibleDeptOptions = ['Library', 'Office of Bursar', 'Academic Department'];
  const libraryConfirmationOptions = ['Pending', 'Due cleared', 'Due not cleared'];
  const academicCorrectionOptions = ['Yes', 'No', 'In Progress', 'Pending Review'];

  return (
    <div className="space-y-6">
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Academic Status</p>
                {getStatusBadge(request.academicStatus || request.academicHistory || 'Pending')}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Library Status</p>
                {getStatusBadge(request.libraryStatus || 'Pending')}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Bursar Status</p>
                {getStatusBadge(request.bursarStatus || 'Pending')}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Overall Status</p>
                {getStatusBadge(request.status || 'Pending')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
            activeTab === 'details'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Request Details
        </button>
        <button
          onClick={() => setActiveTab('academic')}
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
            activeTab === 'academic'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Academic
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
            activeTab === 'library'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Library
        </button>
        <button
          onClick={() => setActiveTab('bursar')}
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${
            activeTab === 'bursar'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Bursar
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <Card>
          <CardHeader>
            <CardTitle>Request Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium mb-4">Request Information</p>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Request ID: </span>
                    <span className="font-medium">{request.requestId || request.id.substring(0, 8)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Student ID: </span>
                    <span className="font-medium">{request.studentId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Student Email: </span>
                    <span className="font-medium">{request.studentEmail}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date of Request: </span>
                    <span className="font-medium">{new Date(request.requestDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requestor: </span>
                    <span className="font-medium">{request.requestor || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-4">Department Statuses</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Academic: </span>
                    {getStatusBadge(request.academicStatus || request.academicHistory || 'Pending')}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Library: </span>
                    {getStatusBadge(request.libraryStatus || 'Pending')}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bursar: </span>
                    {getStatusBadge(request.bursarStatus || 'Pending')}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overall: </span>
                    {getStatusBadge(request.status || 'Pending')}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Details Tab */}
      {activeTab === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select status</option>
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">GPA Recalculation</label>
                <Input
                  value={gpaRecalculation}
                  onChange={(e) => setGpaRecalculation(e.target.value)}
                  placeholder="Enter GPA recalculation"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Change of Programme</label>
                <Input
                  value={changeOfProgramme}
                  onChange={(e) => setChangeOfProgramme(e.target.value)}
                  placeholder="Enter change of programme"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Degree to be Awarded</label>
                <Input
                  value={degreeToBeAwarded}
                  onChange={(e) => setDegreeToBeAwarded(e.target.value)}
                  placeholder="Enter degree"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">InProgress courses for prior semester</label>
                <Input
                  value={inProgressCoursesForPriorSemester}
                  onChange={(e) => setInProgressCoursesForPriorSemester(e.target.value)}
                  placeholder="Enter semester"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Transcript Template Issue</label>
                <Input
                  value={transcriptTemplateIssue}
                  onChange={(e) => setTranscriptTemplateIssue(e.target.value)}
                  placeholder="Enter template issue"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Address Format</label>
                <Input
                  value={addressFormat}
                  onChange={(e) => setAddressFormat(e.target.value)}
                  placeholder="Enter address format"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-2 block">Other</label>
                <Input
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  placeholder="Enter other notes"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Academic Tab */}
      {activeTab === 'academic' && (
        <Card>
          <CardHeader>
            <CardTitle>Academic Department Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Academic History</label>
              <select
                value={academicStatus}
                onChange={(e) => setAcademicStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select status</option>
                {academicStatusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Responsible Dept for Academic Issues</label>
              <select
                value={responsibleDeptForAcademicIssues}
                onChange={(e) => setResponsibleDeptForAcademicIssues(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select department</option>
                {responsibleDeptOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Academic Verifier Comments</label>
              <textarea
                value={academicVerifierComments}
                onChange={(e) => setAcademicVerifierComments(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                placeholder="Enter comments"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Academic Correction Addressed</label>
              <select
                value={academicCorrectionAddressed}
                onChange={(e) => setAcademicCorrectionAddressed(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select status</option>
                {academicCorrectionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Academic Correction Comments</label>
              <textarea
                value={academicCorrectionComments}
                onChange={(e) => setAcademicCorrectionComments(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                placeholder="Enter comments"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Library Tab */}
      {activeTab === 'library' && (
        <Card>
          <CardHeader>
            <CardTitle>Library Department Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Library Dept Status</label>
              <select
                value={libraryStatus}
                onChange={(e) => setLibraryStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select status</option>
                {libraryStatusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Library Dept Due Amount</label>
              <Input
                value={libraryDeptDueAmount}
                onChange={(e) => setLibraryDeptDueAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Library Dept Due Details</label>
              <Input
                value={libraryDeptDueDetails}
                onChange={(e) => setLibraryDeptDueDetails(e.target.value)}
                placeholder="Enter details"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Library Dept Comments</label>
              <textarea
                value={libraryComments}
                onChange={(e) => setLibraryComments(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                placeholder="Enter comments"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bursar Tab */}
      {activeTab === 'bursar' && (
        <Card>
          <CardHeader>
            <CardTitle>Bursar Department Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Bursar Status</label>
              <select
                value={bursarStatus}
                onChange={(e) => setBursarStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select status</option>
                {bursarStatusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Office of Bursar Due Amount</label>
              <Input
                value={officeOfBursarDueAmount}
                onChange={(e) => setOfficeOfBursarDueAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Office of Bursar Due Details</label>
              <Input
                value={officeOfBursarDueDetails}
                onChange={(e) => setOfficeOfBursarDueDetails(e.target.value)}
                placeholder="Enter details"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Bursar's Confirmation for Library Due Payment</label>
              <select
                value={bursarsConfirmationForLibraryDuePayment}
                onChange={(e) => setBursarsConfirmationForLibraryDuePayment(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select status</option>
                {libraryConfirmationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Bursar Comments</label>
              <textarea
                value={bursarComments}
                onChange={(e) => setBursarComments(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                placeholder="Enter comments"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save All Changes'}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </div>
    </div>
  );
}

