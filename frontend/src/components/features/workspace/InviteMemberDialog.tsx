/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { inviteWorkspaceMember } from '@/lib/api';
import { UserPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
    DialogDescription
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UserAutocomplete } from '@/components/common/UserAutocomplete';
import { WorkspaceRole } from '@/lib/enums';
import { toast } from 'sonner';

interface InviteMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId?: number;
    queryClient: any;
}

export const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
    open,
    onOpenChange,
    workspaceId,
    queryClient
}) => {
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState(WorkspaceRole.VIEWER);

    const inviteMutation = useMutation({
        mutationFn: () => inviteWorkspaceMember(workspaceId!, inviteEmail, inviteRole),
        onSuccess: () => {
            toast.success("Teammate Invited", { 
                icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 
            });
            queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
            onOpenChange(false);
            setInviteEmail('');
        },
        onError: (err: any) => {
            toast.error("Invite Failed", { 
                description: err.response?.data?.detail 
            });
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" className="rounded-lg shadow-lg h-9 px-4 gap-2 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-primary/20">
                    <UserPlus size={14} />
                    <span>Invite Member</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-8 glass-panel border-border/60 shadow-2xl">
                <DialogHeader className="mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
                        <UserPlus className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight">
                        Expand the Team
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium opacity-70">
                        Invite a colleague to collaborate on this workspace.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="space-y-2.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">
                            Email Identity
                        </Label>
                        <UserAutocomplete 
                            value={inviteEmail} 
                            onChange={setInviteEmail} 
                            onSelect={setInviteEmail}
                            placeholder="Enter email or search system..."
                        />
                    </div>
                    <div className="space-y-2.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">
                            Initial Permissions
                        </Label>
                        <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                            <SelectTrigger className="h-12 bg-muted/20 border-border/40 rounded-2xl font-bold text-foreground focus:ring-primary/20 transition-all">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/60 shadow-2xl">
                                <SelectItem value={WorkspaceRole.ADMIN} className="rounded-lg font-bold text-xs py-3">
                                    Admin (Full Ownership)
                                </SelectItem>
                                <SelectItem value={WorkspaceRole.EDITOR} className="rounded-lg font-bold text-xs py-3">
                                    Editor (Build & Sync)
                                </SelectItem>
                                <SelectItem value={WorkspaceRole.VIEWER} className="rounded-lg font-bold text-xs py-3">
                                    Viewer (Read Only)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="mt-10 gap-3">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)} 
                        className="rounded-2xl h-12 flex-1 font-bold uppercase tracking-widest text-[10px] hover:bg-muted/50 transition-all"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={() => inviteMutation.mutate()} 
                        disabled={inviteMutation.isPending || !inviteEmail}
                        className="rounded-2xl h-12 flex-1 font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:shadow-primary/40 transition-all gap-2"
                    >
                        {inviteMutation.isPending ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                            <>
                                Send Invitation
                                <CheckCircle2 className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};