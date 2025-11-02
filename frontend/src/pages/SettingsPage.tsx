import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState } from 'react';
import { useToast } from '../components/ui/use-toast';
import { Settings, User, Lock, Bell, Database } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

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

