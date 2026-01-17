import React, { useState } from 'react';
import { 
    Database, ChevronRight, BarChart3, Settings2, Info, Table, Play, Loader2, FileSearch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from '@tanstack/react-query';
import { executeQuery } from '@/lib/api/ephemeral';
import { toast } from 'sonner';
import { ResultsGrid } from '@/components/features/explorer/ResultsGrid';

interface ProSourceEntityDetailsProps {
    entity: any;
    connectionId: number;
    onBack: () => void;
    initialTab?: string;
}

export const ProSourceEntityDetails: React.FC<ProSourceEntityDetailsProps> = ({ 
    entity, 
    connectionId,
    onBack,
    initialTab = 'overview'
}) => {
    const [limit, setLimit] = useState(100);

    const searchMutation = useMutation({
        mutationFn: () => executeQuery(connectionId, { 
            query: `SELECT * FROM ${entity.metadata?.table}`, 
            limit: limit
        }),
        onError: (err: any) => toast.error("Data Fetch Failed", { description: err.message })
    });

    const searchResults = searchMutation.data ? {
        results: searchMutation.data.result_sample?.rows || [],
        columns: searchMutation.data.result_summary?.columns || [],
        count: searchMutation.data.result_summary?.count || 0
    } : null;

    return (
        <div className="h-full flex flex-col rounded-3xl overflow-hidden animate-in slide-in-from-right-4 duration-300">
            <CardHeader className="p-6 border-b border-border/20 shrink-0">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 mb-2">
                            <Button 
                                variant="ghost" size="sm" onClick={onBack}
                                className="h-8 w-8 p-0 rounded-lg hover:bg-muted/80"
                            >
                                <ChevronRight className="h-4 w-4 rotate-180" />
                            </Button>
                            <Badge className="text-[10px] uppercase tracking-widest font-bold bg-indigo-600 text-white border-none">
                                {entity.metadata?.module}
                            </Badge>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">{entity.name}</CardTitle>
                        <CardDescription className="text-xs font-mono font-medium opacity-70 flex items-center gap-2">
                            <Table className="h-3 w-3" /> PHYSICAL TABLE: {entity.metadata?.table}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl h-10 gap-2 font-bold text-xs border-border/40">
                            <BarChart3 className="h-3.5 w-3.5" /> Stats
                        </Button>
                        <Button className="rounded-xl h-10 gap-2 font-bold text-xs bg-indigo-600 hover:bg-indigo-700">
                            <Settings2 className="h-3.5 w-3.5" /> Extract Configuration
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <Tabs defaultValue={initialTab} className="flex-1 flex flex-col min-h-0">
                <div className="px-6 border-b border-border/20 bg-muted/10">
                    <TabsList className="bg-transparent h-12 w-full justify-start gap-6 p-0 border-none">
                        <TabsTrigger value="overview" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 font-bold text-xs px-1 transition-all">Overview</TabsTrigger>
                        <TabsTrigger value="data" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 font-bold text-xs px-1 transition-all">Data Preview</TabsTrigger>
                        <TabsTrigger value="columns" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 font-bold text-xs px-1 transition-all">Columns</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <TabsContent value="overview" className="mt-0 space-y-6 h-full">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard icon={<Database className="h-4 w-4" />} label="Platform" value="Seabed / Oracle" />
                            <StatCard icon={<Info className="h-4 w-4" />} label="Standard" value="PPDM 3.8 / 3.9" />
                            <StatCard icon={<Table className="h-4 w-4" />} label="Access" value="Native SQL" />
                        </div>
                        <div className="p-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2 mb-2"><Info className="h-3.5 w-3.5" /> Domain Context</h5>
                            <p className="text-xs leading-relaxed text-muted-foreground">Maps directly to physical seabed tables. Use the Data Preview tab to see sample records from the Oracle database.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="data" className="mt-0 h-full flex flex-col gap-6">
                        <div className="p-6 rounded-3xl border border-border bg-muted/5 space-y-4 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileSearch className="z-20 h-4 w-4 text-indigo-600" />
                                    <h4 className="font-bold text-sm">Seabed Data Preview</h4>
                                </div>
                                <Badge variant="secondary" className="text-[9px] font-bold">ORACLE NATIVE</Badge>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1 px-4 h-10 rounded-xl bg-background border border-border flex items-center text-xs font-mono text-muted-foreground">
                                    SELECT * FROM {entity.metadata?.table}
                                </div>
                                <Button 
                                    onClick={() => searchMutation.mutate()}
                                    disabled={searchMutation.isPending}
                                    className="rounded-xl h-10 px-6 font-bold gap-2 bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                    Fetch Sample
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0">
                            <ResultsGrid 
                                data={searchResults} 
                                isLoading={searchMutation.isPending} 
                                variant="embedded"
                                noBorder
                                noBackground
                            />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) => (
    <div className="p-4 rounded-2xl border border-border/40 bg-muted/10 space-y-2 hover:bg-muted/20 transition-all">
        <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
        </div>
        <p className="text-sm font-bold text-foreground truncate">{value || 'N/A'}</p>
    </div>
);
