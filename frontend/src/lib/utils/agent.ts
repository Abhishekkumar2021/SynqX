/**
 * Checks if an agent group or a name is considered "remote".
 * Following the DRY principle for both workspaces and pipelines.
 */
export const isRemoteGroup = (groupName?: string | null): boolean => {
  return !!groupName && groupName !== 'internal';
};
