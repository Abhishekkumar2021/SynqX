/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { deleteWorkspace } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface DangerZoneProps {
    workspaceId?: number;
    queryClient: any;
}

export const DangerZone: React.FC<DangerZoneProps> = ({ workspaceId }) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const deleteWsMutation = useMutation({
        mutationFn: () => deleteWorkspace(workspaceId!),
        onSuccess: () => {
            toast.success("Workspace Terminated");
            window.location.href = '/dashboard';
        },
        onError: (err: any) => {
            toast.error("Deletion Failed", { description: err.response?.data?.detail });
        }
    });

    return (
        <>
            <div className="rounded-[1.5rem] border border-destructive/30 bg-destructive/5 backdrop-blur-xl shadow-xl overflow-hidden group/danger relative">
                <div className="absolute -bottom-6 -right-6 p-4 opacity-[0.03] group-hover/danger:opacity-[0.08] transition-all duration-1000 -rotate-12 scale-150 text-destructive pointer-events-none">
                    <AlertTriangle size={100} />
                </div>
                
                <div className="p-4 border-b border-destructive/20 bg-destructive/10 flex items-center gap-2.5 text-destructive relative z-10">
                    <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                    <h4 className="text-[9px] font-bold uppercase tracking-widest">
                        Termination Protocol
                    </h4>
                </div>
                
                <div className="p-6 relative z-10">
                    <p className="text-[10px] font-bold text-destructive/70 mb-6 leading-relaxed uppercase tracking-tight">
                        Permanent destruction of all integration logic and sync state.
                    </p>
                    
                    <Button 
                        variant="destructive" 
                        className="w-full rounded-xl h-11 font-bold uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-destructive/20 hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-destructive/20 bg-destructive text-destructive-foreground"
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        Execute Purge
                    </Button>
                </div>
            </div>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] p-8">
                    <DialogHeader>
                        <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4 ring-1 ring-destructive/20">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                        </div>
                        <DialogTitle className="text-2xl font-bold tracking-tight">
                            Confirm Workspace Deletion
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium">
                            This action cannot be undone. All data, members, and configurations will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-8 gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="rounded-2xl h-12 flex-1 font-bold uppercase tracking-widest text-[10px]"
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={() => deleteWsMutation.mutate()}
                            disabled={deleteWsMutation.isPending}
                            className="rounded-2xl h-12 flex-1 font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-destructive/20"
                        >
                            Delete Workspace
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};