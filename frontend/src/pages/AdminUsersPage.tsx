import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api';
import { useToast } from '../components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatDate } from '../lib/utils';
import { Search } from 'lucide-react';

const roles = ['STUDENT', 'LIBRARY', 'BURSAR', 'ACADEMIC', 'VERIFIER', 'PROCESSOR', 'ADMIN'];

export function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers({ limit: 100 }),
  });

  const users = data?.data?.users || [];

  // Filter users by search
  const filteredUsers = users.filter((user: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      return adminApi.updateUserRole(id, role);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update user role',
        variant: 'destructive',
      });
    },
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    await updateRoleMutation.mutateAsync({ id: userId, role: newRole });
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
              <p className="text-muted-foreground">No users found</p>
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
                  {filteredUsers.map((user: any) => (
                    <tr key={user.id} className="border-b hover:bg-accent transition-colors">
                      <td className="p-3 text-sm font-medium">{user.name}</td>
                      <td className="p-3 text-sm">{user.email}</td>
                      <td className="p-3">
                        <Badge>{user.role}</Badge>
                      </td>
                      <td className="p-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                          disabled={updateRoleMutation.isPending}
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleChange(user.id, user.role)}
                          disabled={updateRoleMutation.isPending}
                        >
                          Save
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
