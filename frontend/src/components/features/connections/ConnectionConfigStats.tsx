/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { getConnectionImpact, getConnectionUsageStats } from '@/lib/api';
import { ConfigurationTabContent } from './ConfigurationTabContent';

export const ConnectionConfigStats = ({ connection, connectionId }: { connection: any; connectionId: number }) => {
    const {
        data: impactData,
        isLoading: loadingImpact
    } = useQuery({
        queryKey: ['connectionImpact', connectionId],
        queryFn: () => getConnectionImpact(connectionId),
        enabled: !!connection,
    });

    const {
        data: usageStats,
        isLoading: loadingUsageStats
    } = useQuery({
        queryKey: ['connectionUsageStats', connectionId],
        queryFn: () => getConnectionUsageStats(connectionId),
        enabled: !!connection,
    });

    return (
        <ConfigurationTabContent
            connection={connection}
            impactData={impactData}
            loadingImpact={loadingImpact}
            usageStats={usageStats}
            loadingUsageStats={loadingUsageStats}
        />
    );
};