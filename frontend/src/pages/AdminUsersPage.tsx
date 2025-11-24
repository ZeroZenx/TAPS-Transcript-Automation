import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api';
import { useToast } from '../components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatDate } from '../lib/utils';
import { Search, Edit2, Check, X } from 'lucide-react';

// Only staff roles who can login - STUDENT role excluded
const roles = ['LIBRARY', 'BURSAR', 'ACADEMIC', 'VERIFIER', 'PROCESSOR', 'ADMIN'];

export function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers({ limit: 100 }),
  });

  const users = data?.data?.users || [];

  // Additional client-side filter to ensure only staff users with login access are shown
  // This is a safety net - backend should already filter, but this ensures STUDENT users never appear
  const staffRoles = ['LIBRARY', 'BURSAR', 'ACADEMIC', 'VERIFIER', 'PROCESSOR', 'ADMIN'];
  const staffUsers = users.filter((user: any) => 
    staffRoles.includes(user.role?.toUpperCase())
  );

  // Filter users by search
  const filteredUsers = staffUsers.filter((user: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  // Track which user is being edited
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ [key: string]: { name: string; email: string; role: string } }>({});

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; email?: string; role?: string } }) => {
      return adminApi.updateUser(id, data);
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      setEditingUser(null);
      // Clear edit data for this user
      const newEditData = { ...editData };
      delete newEditData[variables.id];
      setEditData(newEditData);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update user',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (user: any) => {
    setEditingUser(user.id);
    setEditData({
      ...editData,
      [user.id]: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  };

  const handleCancel = (userId: string) => {
    setEditingUser(null);
    const newEditData = { ...editData };
    delete newEditData[userId];
    setEditData(newEditData);
  };

  const handleSave = async (userId: string) => {
    const data = editData[userId];
    if (!data) return;

    const updates: { name?: string; email?: string; role?: string } = {};
    const originalUser = filteredUsers.find((u: any) => u.id === userId);

    if (data.name !== originalUser.name) {
      updates.name = data.name;
    }
    if (data.email !== originalUser.email) {
      updates.email = data.email;
    }
    if (data.role !== originalUser.role) {
      updates.role = data.role;
    }

    if (Object.keys(updates).length > 0) {
      await updateUserMutation.mutateAsync({ id: userId, data: updates });
    } else {
      handleCancel(userId);
    }
  };

  const handleFieldChange = (userId: string, field: 'name' | 'email' | 'role', value: string) => {
    setEditData({
      ...editData,
      [userId]: {
        ...editData[userId],
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage user roles and permissions
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {staffUsers.length === 0 ? 'No staff users found' : 'No users match your search'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Name</th>
                    <th className="text-left p-3 text-sm font-medium">Email</th>
                    <th className="text-left p-3 text-sm font-medium">Current Role</th>
                    <th className="text-left p-3 text-sm font-medium">Change Role</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user: any) => {
                    const isEditing = editingUser === user.id;
                    const currentEditData = editData[user.id] || { name: user.name, email: user.email, role: user.role };

                    return (
                      <tr key={user.id} className="border-b hover:bg-accent transition-colors">
                        <td className="p-3">
                          {isEditing ? (
                            <Input
                              value={currentEditData.name}
                              onChange={(e) => handleFieldChange(user.id, 'name', e.target.value)}
                              className="w-full text-sm"
                              placeholder="Name"
                            />
                          ) : (
                            <span className="text-sm font-medium">{user.name}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <Input
                              type="email"
                              value={currentEditData.email}
                              onChange={(e) => handleFieldChange(user.id, 'email', e.target.value)}
                              className="w-full text-sm"
                              placeholder="email@example.com"
                            />
                          ) : (
                            <span className="text-sm">{user.email}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {!isEditing && <Badge>{user.role}</Badge>}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select
                              value={currentEditData.role}
                              onChange={(e) => handleFieldChange(user.id, 'role', e.target.value)}
                              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm w-full"
                            >
                              {roles.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) => handleFieldChange(user.id, 'role', e.target.value)}
                              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                              disabled
                              style={{ opacity: 0.5 }}
                            >
                              {roles.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSave(user.id)}
                                disabled={updateUserMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancel(user.id)}
                                disabled={updateUserMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(user)}
                              disabled={editingUser !== null}
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
