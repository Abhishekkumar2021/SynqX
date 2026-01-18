/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { motion } from 'framer-motion';

// Domain Explorers
import { DomainBrowser } from '@/components/features/connections/domain/DomainBrowser';
import { LiveFileExplorer } from '@/components/features/connections/LiveFileExplorer';
import { SQLExplorer } from './SQLExplorer';
import { ExplorerZeroState } from './ExplorerZeroState';
import { ExplorerUnsupportedState } from './ExplorerUnsupportedState';

interface ExplorerContentRouterProps {
    selectedConnectionId: string | null;
    connectionName: string;
    explorerType: string;
    connectorType: string;
    discoveredAssets: any[];
    isLoadingDiscovered: boolean;
    isDiscoverMutationPending: boolean;
    onDiscover: () => void;
    onHistoryToggle: () => void;
    onRefetchHistory: () => void;
    isSidebarCollapsed: boolean;
    onToggleSidebar: () => void;
    onResetSelection: () => void;
}

export const ExplorerContentRouter: React.FC<ExplorerContentRouterProps> = ({
    selectedConnectionId,
    connectionName,
    explorerType,
    connectorType,
    discoveredAssets,
    isLoadingDiscovered,
    isDiscoverMutationPending,
    onDiscover,
    onHistoryToggle,
    onRefetchHistory,
    isSidebarCollapsed,
    onToggleSidebar,
    onResetSelection
}) => {
    // Branch 1: No selection
    if (!selectedConnectionId) {
        return (
            <ExplorerZeroState 
                isSidebarCollapsed={isSidebarCollapsed} 
                onToggleSidebar={onToggleSidebar} 
            />
        );
    }

    // Branch 2: Domain Explorers
    if (explorerType === 'osdu' || explorerType === 'prosource') {
        return (
            <motion.div key={explorerType} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                <DomainBrowser 
                    connectionId={parseInt(selectedConnectionId)} 
                    connectionName={connectionName}
                    connectorType={explorerType}
                    assets={discoveredAssets || []}
                    isLoading={isLoadingDiscovered || isDiscoverMutationPending}
                    onDiscover={onDiscover}
                />
            </motion.div>
        );
    }

    // Branch 3: File Explorer
    if (explorerType === 'file') {
        return (
            <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                <LiveFileExplorer connectionId={parseInt(selectedConnectionId)} />
            </motion.div>
        );
    }

    // Branch 4: SQL Explorer
    if (explorerType === 'sql') {
        return (
            <motion.div key="sql" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                <SQLExplorer 
                    connectionId={parseInt(selectedConnectionId)} 
                    onHistoryToggle={onHistoryToggle}
                    onRefetchHistory={onRefetchHistory}
                />
            </motion.div>
        );
    }

    // Branch 5: Unsupported
    return (
        <ExplorerUnsupportedState 
            connectorType={connectorType} 
            onBack={onResetSelection} 
        />
    );
};