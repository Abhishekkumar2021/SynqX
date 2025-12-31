/**
 * Formats a technical audit event string into a user-friendly label.
 * Example: "connection.create" -> "Connection Created"
 */
export const formatEventName = (eventType: string): string => {
  if (!eventType) return "Unknown Event";

  // Split by dot (e.g., "user.login", "pipeline.create")
  const parts = eventType.split(".");
  if (parts.length === 1) {
    return eventType.charAt(0).toUpperCase() + eventType.slice(1);
  }

  const [domain, action] = parts;

  // Handle common mappings
  const domainMap: Record<string, string> = {
    user: "User",
    pipeline: "Pipeline",
    connection: "Connection",
    asset: "Asset",
    workspace: "Workspace",
    api_key: "API Key",
    alert_config: "Alert Rule",
  };

  const actionMap: Record<string, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    login: "Logged In",
    logout: "Logged Out",
    trigger: "Triggered",
    publish: "Published",
    switch: "Switched",
    invite: "Invited",
    member_add: "Member Added",
    member_remove: "Member Removed",
    member_update: "Member Updated",
  };

  const formattedDomain = domainMap[domain.toLowerCase()] || domain.charAt(0).toUpperCase() + domain.slice(1);
  const formattedAction = actionMap[action.toLowerCase()] || action.charAt(0).toUpperCase() + action.slice(1);

  return `${formattedDomain} ${formattedAction}`;
};
