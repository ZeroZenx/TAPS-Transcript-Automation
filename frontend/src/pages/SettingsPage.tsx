import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/ui/use-toast';
import { settingsApi } from '../services/api';
import { Settings, User, Lock, Bell, Database, Mail, Send } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [testEmailAddress, setTestEmailAddress] = useState('');

  // Fetch settings
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getSettings(),
  });

  const settings = settingsData?.data?.settings;

  // Email configuration state
  const [emailConfig, setEmailConfig] = useState({
    emailAccount: '',
    emailPassword: '',
    tenantId: '',
    clientId: '',
    clientSecret: '',
    useClientCredentials: false,
    fromName: '',
    replyTo: '',
    enableAlerts: true,
    enableReminders: true,
    libraryEmail: '',
    bursarEmail: '',
    academicEmail: '',
    libraryQueueTemplate: '',
    libraryQueueSubject: '',
    bursarQueueTemplate: '',
    bursarQueueSubject: '',
    academicQueueTemplate: '',
    academicQueueSubject: '',
    academicCompletedTemplate: '',
    academicCompletedSubject: '',
    academicCorrectionTemplate: '',
    academicCorrectionSubject: '',
    reminderHoursLibrary: 48,
    reminderHoursBursar: 48,
    reminderHoursAcademic: 48,
    enableReminderLibrary: true,
    enableReminderBursar: true,
    enableReminderAcademic: true,
  });

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setEmailConfig({
        emailAccount: settings.emailAccount || '',
        emailPassword: settings.emailPassword === '***ENCRYPTED***' ? '' : (settings.emailPassword || ''),
        tenantId: settings.tenantId || '',
        clientId: settings.clientId || '',
        clientSecret: settings.clientSecret === '***ENCRYPTED***' ? '' : (settings.clientSecret || ''),
        useClientCredentials: settings.useClientCredentials || false,
        fromName: settings.fromName || '',
        replyTo: settings.replyTo || '',
        enableAlerts: settings.enableAlerts !== undefined ? settings.enableAlerts : true,
        enableReminders: settings.enableReminders !== undefined ? settings.enableReminders : true,
        libraryEmail: settings.libraryEmail || '',
        bursarEmail: settings.bursarEmail || '',
        academicEmail: settings.academicEmail || '',
        libraryQueueTemplate: settings.libraryQueueTemplate || 'Dear colleagues,\n\nA transcript request has been submitted by {{STUDENT_NAME}} {{STUDENT_ID}}.\n\nPlease indicate if {{STUDENT_NAME}} is cleared for processing.\n\nRegards,',
        libraryQueueSubject: settings.libraryQueueSubject || 'Library Department Review Pending - {{REQUEST_ID}}',
        bursarQueueTemplate: settings.bursarQueueTemplate || 'Dear colleagues,\n\nA transcript request has been submitted by {{STUDENT_NAME}} {{STUDENT_ID}}.\n\nPlease indicate if {{STUDENT_NAME}} is cleared for processing.\n\nRegards,',
        bursarQueueSubject: settings.bursarQueueSubject || 'Bursar Department Review Pending - {{REQUEST_ID}}',
        academicQueueTemplate: settings.academicQueueTemplate || 'Dear Academic Department,\n\n{{STUDENT_NAME}} {{STUDENT_ID}} has submitted a request for a transcript. Based on our review of the student\'s academic history, we noticed missing details for the following:\n\n\n\nPlease submit the updated GPA Guide and the relevant documents as per the details provided above.\n\nThese submissions must be uploaded by 3 working days from notification date.\n\nRegards,',
        academicQueueSubject: settings.academicQueueSubject || 'Academic corrections required: {{REQUEST_ID}}',
        academicCompletedTemplate: settings.academicCompletedTemplate || 'Dear Transcript Processor,\n\nTranscript request - {{REQUEST_ID}} - {{STUDENT_ID}} has been verified and there are no corrections.\n\nRegards,',
        academicCompletedSubject: settings.academicCompletedSubject || 'Transcript Request for Academic Verification Completed - {{REQUEST_ID}}',
        academicCorrectionTemplate: settings.academicCorrectionTemplate || 'Dear Transcript Processor,\n\nTranscript request - {{REQUEST_ID}} - {{STUDENT_ID}} has been reviewed and corrections are required.:\n\nRegards,',
        academicCorrectionSubject: settings.academicCorrectionSubject || 'Academic corrections required: {{REQUEST_ID}}',
        reminderHoursLibrary: settings.reminderHoursLibrary || 48,
        reminderHoursBursar: settings.reminderHoursBursar || 48,
        reminderHoursAcademic: settings.reminderHoursAcademic || 48,
        enableReminderLibrary: settings.enableReminderLibrary !== undefined ? settings.enableReminderLibrary : true,
        enableReminderBursar: settings.enableReminderBursar !== undefined ? settings.enableReminderBursar : true,
        enableReminderAcademic: settings.enableReminderAcademic !== undefined ? settings.enableReminderAcademic : true,
      });
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => settingsApi.updateSettings(data),
    onSuccess: () => {
      toast({
        title: 'Settings Updated',
        description: 'Email configuration has been saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update settings',
        variant: 'destructive',
      });
    },
  });

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: (testEmail: string) => settingsApi.testEmail(testEmail),
    onSuccess: () => {
      toast({
        title: 'Test Email Sent',
        description: 'Test email has been sent successfully. Please check your inbox.',
      });
      setTestEmailAddress('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to send test email',
        variant: 'destructive',
      });
    },
  });

  const handleSaveEmailSettings = () => {
    updateSettingsMutation.mutate(emailConfig);
  };

  const handleTestEmail = () => {
    if (!testEmailAddress) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a test email address',
        variant: 'destructive',
      });
      return;
    }
    testEmailMutation.mutate(testEmailAddress);
  };

  const handleSaveProfile = () => {
    toast({
      title: 'Profile Updated',
      description: 'Your profile has been updated successfully',
    });
  };

  const handleChangePassword = () => {
    toast({
      title: 'Password Change',
      description: 'Password change functionality will be available soon',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Email Configuration */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Email Configuration</CardTitle>
            </div>
            <CardDescription>
              Configure Office 365 account for sending alerts and reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingSettings ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading settings...</p>
              </div>
            ) : (
              <>
                {/* Authentication Method */}
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Authentication Method</label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use Client Credentials (Service Principal) for production
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailConfig.useClientCredentials}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, useClientCredentials: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Use Client Credentials</span>
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Office 365 Email Account */}
                  <div className="space-y-2">
                    <label htmlFor="emailAccount" className="text-sm font-medium">
                      Office 365 Email Account *
                    </label>
                    <Input
                      id="emailAccount"
                      type="email"
                      value={emailConfig.emailAccount}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, emailAccount: e.target.value })
                      }
                      placeholder="taps@costaatt.edu.tt"
                    />
                  </div>

                  {/* Email Password (only if not using client credentials) */}
                  {!emailConfig.useClientCredentials && (
                    <div className="space-y-2">
                      <label htmlFor="emailPassword" className="text-sm font-medium">
                        Email Password
                      </label>
                      <Input
                        id="emailPassword"
                        type="password"
                        value={emailConfig.emailPassword}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, emailPassword: e.target.value })
                        }
                        placeholder="Enter email password"
                      />
                    </div>
                  )}

                  {/* Azure AD Tenant ID (only if using client credentials) */}
                  {emailConfig.useClientCredentials && (
                    <div className="space-y-2">
                      <label htmlFor="tenantId" className="text-sm font-medium">
                        Azure AD Tenant ID *
                      </label>
                      <Input
                        id="tenantId"
                        value={emailConfig.tenantId}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, tenantId: e.target.value })
                        }
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      />
                    </div>
                  )}

                  {/* Azure AD Client ID (only if using client credentials) */}
                  {emailConfig.useClientCredentials && (
                    <div className="space-y-2">
                      <label htmlFor="clientId" className="text-sm font-medium">
                        Azure AD Client ID *
                      </label>
                      <Input
                        id="clientId"
                        value={emailConfig.clientId}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, clientId: e.target.value })
                        }
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      />
                    </div>
                  )}

                  {/* Azure AD Client Secret (only if using client credentials) */}
                  {emailConfig.useClientCredentials && (
                    <div className="space-y-2">
                      <label htmlFor="clientSecret" className="text-sm font-medium">
                        Azure AD Client Secret *
                      </label>
                      <Input
                        id="clientSecret"
                        type="password"
                        value={emailConfig.clientSecret}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, clientSecret: e.target.value })
                        }
                        placeholder="Enter client secret"
                      />
                    </div>
                  )}

                  {/* From Name */}
                  <div className="space-y-2">
                    <label htmlFor="fromName" className="text-sm font-medium">
                      From Name
                    </label>
                    <Input
                      id="fromName"
                      value={emailConfig.fromName}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, fromName: e.target.value })
                      }
                      placeholder="TAPS System"
                    />
                  </div>

                  {/* Reply To */}
                  <div className="space-y-2">
                    <label htmlFor="replyTo" className="text-sm font-medium">
                      Reply-To Email
                    </label>
                    <Input
                      id="replyTo"
                      type="email"
                      value={emailConfig.replyTo}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, replyTo: e.target.value })
                      }
                      placeholder="reply@costaatt.edu.tt"
                    />
                  </div>
                </div>

                {/* Email Settings Toggles */}
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Enable Email Alerts</label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Send email alerts for status changes and updates
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailConfig.enableAlerts}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, enableAlerts: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Enable Email Reminders</label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Send email reminders for pending requests
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailConfig.enableReminders}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, enableReminders: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                    </label>
                  </div>
                </div>

                {/* Test Email Section */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Test Email Configuration</label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Send a test email to verify your configuration
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="test@example.com"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleTestEmail}
                      disabled={testEmailMutation.isPending || !testEmailAddress}
                      variant="outline"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {testEmailMutation.isPending ? 'Sending...' : 'Send Test Email'}
                    </Button>
                  </div>
                </div>

                {/* Department Email Addresses */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Department Email Addresses</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label htmlFor="libraryEmail" className="text-sm font-medium">
                        Library Email *
                      </label>
                      <Input
                        id="libraryEmail"
                        type="email"
                        value={emailConfig.libraryEmail}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, libraryEmail: e.target.value })
                        }
                        placeholder="library@costaatt.edu.tt"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="bursarEmail" className="text-sm font-medium">
                        Bursar Email *
                      </label>
                      <Input
                        id="bursarEmail"
                        type="email"
                        value={emailConfig.bursarEmail}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, bursarEmail: e.target.value })
                        }
                        placeholder="bursar@costaatt.edu.tt"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="academicEmail" className="text-sm font-medium">
                        Academic Email *
                      </label>
                      <Input
                        id="academicEmail"
                        type="email"
                        value={emailConfig.academicEmail}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, academicEmail: e.target.value })
                        }
                        placeholder="academic@costaatt.edu.tt"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Templates */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Email Templates</h3>
                  <p className="text-sm text-muted-foreground">
                    Use variables: {'{{REQUEST_ID}}'}, {'{{STUDENT_NAME}}'}, {'{{STUDENT_ID}}'}, {'{{STUDENT_EMAIL}}'}, {'{{PROGRAM}}'}
                  </p>
                  
                  <div className="space-y-6">
                    {/* Library Queue Template */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h4 className="font-semibold text-base">Library Queue Notification</h4>
                      <div className="space-y-2">
                        <label htmlFor="libraryQueueSubject" className="text-sm font-medium">
                          Email Subject
                        </label>
                        <Input
                          id="libraryQueueSubject"
                          value={emailConfig.libraryQueueSubject}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, libraryQueueSubject: e.target.value })
                          }
                          placeholder="Library Department Review Pending - {{REQUEST_ID}}"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="libraryQueueTemplate" className="text-sm font-medium">
                          Email Body Template
                        </label>
                        <textarea
                          id="libraryQueueTemplate"
                          value={emailConfig.libraryQueueTemplate}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, libraryQueueTemplate: e.target.value })
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] font-mono"
                          placeholder="Dear colleagues,..."
                        />
                      </div>
                    </div>

                    {/* Bursar Queue Template */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h4 className="font-semibold text-base">Bursar Queue Notification</h4>
                      <div className="space-y-2">
                        <label htmlFor="bursarQueueSubject" className="text-sm font-medium">
                          Email Subject
                        </label>
                        <Input
                          id="bursarQueueSubject"
                          value={emailConfig.bursarQueueSubject}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, bursarQueueSubject: e.target.value })
                          }
                          placeholder="Bursar Department Review Pending - {{REQUEST_ID}}"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="bursarQueueTemplate" className="text-sm font-medium">
                          Email Body Template
                        </label>
                        <textarea
                          id="bursarQueueTemplate"
                          value={emailConfig.bursarQueueTemplate}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, bursarQueueTemplate: e.target.value })
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] font-mono"
                          placeholder="Dear colleagues,..."
                        />
                      </div>
                    </div>

                    {/* Academic Queue Template (Corrections Required) */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h4 className="font-semibold text-base">Academic Queue - Corrections Required</h4>
                      <div className="space-y-2">
                        <label htmlFor="academicQueueSubject" className="text-sm font-medium">
                          Email Subject
                        </label>
                        <Input
                          id="academicQueueSubject"
                          value={emailConfig.academicQueueSubject}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, academicQueueSubject: e.target.value })
                          }
                          placeholder="Academic corrections required: {{REQUEST_ID}}"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="academicQueueTemplate" className="text-sm font-medium">
                          Email Body Template (to Academic Department)
                        </label>
                        <textarea
                          id="academicQueueTemplate"
                          value={emailConfig.academicQueueTemplate}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, academicQueueTemplate: e.target.value })
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[150px] font-mono"
                          placeholder="Dear Academic Department,..."
                        />
                      </div>
                    </div>

                    {/* Academic Verification Completed */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h4 className="font-semibold text-base">Academic Verification Completed</h4>
                      <div className="space-y-2">
                        <label htmlFor="academicCompletedSubject" className="text-sm font-medium">
                          Email Subject
                        </label>
                        <Input
                          id="academicCompletedSubject"
                          value={emailConfig.academicCompletedSubject}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, academicCompletedSubject: e.target.value })
                          }
                          placeholder="Transcript Request for Academic Verification Completed - {{REQUEST_ID}}"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="academicCompletedTemplate" className="text-sm font-medium">
                          Email Body Template (to Transcript Processor)
                        </label>
                        <textarea
                          id="academicCompletedTemplate"
                          value={emailConfig.academicCompletedTemplate}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, academicCompletedTemplate: e.target.value })
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] font-mono"
                          placeholder="Dear Transcript Processor,..."
                        />
                      </div>
                    </div>

                    {/* Academic Corrections Required (to Processor) */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h4 className="font-semibold text-base">Academic Corrections Required (to Processor)</h4>
                      <div className="space-y-2">
                        <label htmlFor="academicCorrectionSubject" className="text-sm font-medium">
                          Email Subject
                        </label>
                        <Input
                          id="academicCorrectionSubject"
                          value={emailConfig.academicCorrectionSubject}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, academicCorrectionSubject: e.target.value })
                          }
                          placeholder="Academic corrections required: {{REQUEST_ID}}"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="academicCorrectionTemplate" className="text-sm font-medium">
                          Email Body Template (to Transcript Processor)
                        </label>
                        <textarea
                          id="academicCorrectionTemplate"
                          value={emailConfig.academicCorrectionTemplate}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, academicCorrectionTemplate: e.target.value })
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] font-mono"
                          placeholder="Dear Transcript Processor,..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reminder Settings */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Reminder Email Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure reminder emails for Library, Bursar, and Academic departments if they haven't responded within the specified time
                    </p>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Library Reminder Settings */}
                      <div className="space-y-3 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-base">Library Reminders</h4>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={emailConfig.enableReminderLibrary}
                              onChange={(e) =>
                                setEmailConfig({ ...emailConfig, enableReminderLibrary: e.target.checked })
                              }
                              className="h-4 w-4"
                            />
                            <span className="text-sm">Enable</span>
                          </label>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="reminderHoursLibrary" className="text-sm font-medium">
                            Reminder After (Hours)
                          </label>
                          <Input
                            id="reminderHoursLibrary"
                            type="number"
                            min="1"
                            value={emailConfig.reminderHoursLibrary}
                            onChange={(e) =>
                              setEmailConfig({ ...emailConfig, reminderHoursLibrary: parseInt(e.target.value) || 48 })
                            }
                            placeholder="48"
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Send reminder if Library hasn't responded within this time
                          </p>
                        </div>
                      </div>

                      {/* Bursar Reminder Settings */}
                      <div className="space-y-3 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-base">Bursar Reminders</h4>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={emailConfig.enableReminderBursar}
                              onChange={(e) =>
                                setEmailConfig({ ...emailConfig, enableReminderBursar: e.target.checked })
                              }
                              className="h-4 w-4"
                            />
                            <span className="text-sm">Enable</span>
                          </label>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="reminderHoursBursar" className="text-sm font-medium">
                            Reminder After (Hours)
                          </label>
                          <Input
                            id="reminderHoursBursar"
                            type="number"
                            min="1"
                            value={emailConfig.reminderHoursBursar}
                            onChange={(e) =>
                              setEmailConfig({ ...emailConfig, reminderHoursBursar: parseInt(e.target.value) || 48 })
                            }
                            placeholder="48"
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Send reminder if Bursar hasn't responded within this time
                          </p>
                        </div>
                      </div>

                      {/* Academic Reminder Settings */}
                      <div className="space-y-3 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-base">Academic Reminders</h4>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={emailConfig.enableReminderAcademic}
                              onChange={(e) =>
                                setEmailConfig({ ...emailConfig, enableReminderAcademic: e.target.checked })
                              }
                              className="h-4 w-4"
                            />
                            <span className="text-sm">Enable</span>
                          </label>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="reminderHoursAcademic" className="text-sm font-medium">
                            Reminder After (Hours)
                          </label>
                          <Input
                            id="reminderHoursAcademic"
                            type="number"
                            min="1"
                            value={emailConfig.reminderHoursAcademic}
                            onChange={(e) =>
                              setEmailConfig({ ...emailConfig, reminderHoursAcademic: parseInt(e.target.value) || 48 })
                            }
                            placeholder="48"
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Send reminder if Academic hasn't responded within this time
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSaveEmailSettings}
                  disabled={updateSettingsMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Email Settings'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Input
                value={user?.role || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <Button onClick={handleSaveProfile} className="w-full">
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Button
                variant="outline"
                onClick={handleChangePassword}
                className="w-full"
              >
                Change Password
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Authentication Method</label>
              <Input
                value={user?.email ? 'Local Login' : 'Microsoft 365'}
                disabled
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Configure your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive email updates about your requests
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Request Status Updates</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when request status changes
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>System Information</CardTitle>
            </div>
            <CardDescription>Application version and details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Application Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Environment</span>
                <span className="font-medium">Production</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">{user?.id?.substring(0, 8)}...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

