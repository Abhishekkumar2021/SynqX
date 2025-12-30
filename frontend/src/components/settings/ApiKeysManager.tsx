/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, Key, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { getApiKeys, createApiKey, revokeApiKey, type ApiKeyCreate } from '@/lib/api';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const ApiKeysManager = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRevokeAlertOpen, setIsRevokeAlertOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<number | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [expiryDays, setExpiryDays] = useState<string>('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: getApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: (data: ApiKeyCreate) => createApiKey(data),
    onSuccess: (data) => {
      setCreatedKey(data.key);
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API Key Generated', {
        description: 'Your new key is ready. Please copy it now.'
      });
      setNewKeyName('');
      setExpiryDays('');
    },
    onError: (error: any) => {
      toast.error('Generation Failed', {
        description: error.response?.data?.detail || 'Failed to create API key'
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('Key Revoked', {
        description: 'The API key has been permanently deactivated.'
      });
      setIsRevokeAlertOpen(false);
      setKeyToRevoke(null);
    },
    onError: (error: any) => {
      toast.error('Revocation Failed', {
        description: error.response?.data?.detail || 'Failed to revoke API key'
      });
    },
  });

  const handleRevokeClick = (id: number) => {
    setKeyToRevoke(id);
    setIsRevokeAlertOpen(true);
  };

  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    createMutation.mutate({
      name: newKeyName,
      expires_in_days: expiryDays ? parseInt(expiryDays) : undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const closeDialog = () => {
    setIsCreateOpen(false);
    setCreatedKey(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground mt-2">
            Manage your API keys for programmatic access to the SynqX API.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Generate New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New API Key</DialogTitle>
              <DialogDescription>
                Create a new API key to access SynqX resources.
              </DialogDescription>
            </DialogHeader>

            {!createdKey ? (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., CI/CD Pipeline"
                    className="col-span-3"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expiry" className="text-right">
                    Expires In (Days)
                  </Label>
                  <Input
                    id="expiry"
                    type="number"
                    placeholder="Optional (blank for never)"
                    className="col-span-3"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
                  <p className="text-sm font-medium text-amber-500 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Make sure to copy your API key now. You won't be able to see it again!
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 bg-background p-2 rounded border font-mono text-sm break-all">
                      {createdKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(createdKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              {!createdKey ? (
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Generating...' : 'Generate Key'}
                </Button>
              ) : (
                <Button onClick={closeDialog}>Done</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Keys</CardTitle>
          <CardDescription>
            List of active and inactive API keys associated with your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys && apiKeys.length > 0 ? (
                  apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          {key.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{key.prefix}...</TableCell>
                      <TableCell>
                        <Badge
                          variant={key.is_active ? 'default' : 'secondary'}
                          className={
                            key.is_active
                              ? 'bg-green-500/15 text-green-500 hover:bg-green-500/25'
                              : ''
                          }
                        >
                          {key.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(key.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {key.expires_at ? (
                          format(new Date(key.expires_at), 'MMM d, yyyy')
                        ) : (
                          <span className="text-xs opacity-50">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {key.last_used_at ? (
                          format(new Date(key.last_used_at), 'MMM d, HH:mm')
                        ) : (
                          <span className="text-xs opacity-50">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/90"
                          onClick={() => handleRevokeClick(key.id)}
                          disabled={revokeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No API keys found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isRevokeAlertOpen} onOpenChange={setIsRevokeAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              Any applications or scripts using this key will immediately lose access to the API. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setKeyToRevoke(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => keyToRevoke && revokeMutation.mutate(keyToRevoke)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
