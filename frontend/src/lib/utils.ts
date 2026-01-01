import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { differenceInSeconds, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatRelativeTime = (date: string | Date | null | undefined) => {
    if (!date) return '—';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatDuration = (start: string | Date, end: string | Date | null) => {
    if (!start) return '-';
    const endTime = end ? new Date(end) : new Date();
    const seconds = differenceInSeconds(endTime, new Date(start));
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
};

export const formatDurationMs = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    return `${minutes}m ${remainingSeconds}s`;
};

export const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0';
    
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1
    }).format(num);
};

export const formatFullNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(num);
};

export const formatBytes = (bytes: number, decimals = 2) => {
    if (!Number.isFinite(bytes) || bytes < 0) return '—';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
