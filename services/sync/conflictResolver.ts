export function resolveConflict(
  local: any,
  server: any,
): "local" | "server" | "merge" {
  // Strategy: last-write-wins based on timestamps
  const localTime = local.lastModified || 0;
  const serverTime = server.lastModified || 0;

  if (serverTime > localTime) return "server";
  if (localTime > serverTime) return "local";
  return "merge"; // if equal, merge (could be same data)
}

// Merge function for specific entities
export function mergeProduct(local: any, server: any): any {
  // Server fields take precedence for version, status, etc.
  // But preserve local fields that are newer
  return {
    ...local,
    ...server,
    // Preserve local ID
    id: local.id,
    // Server fields may override (except the local primary key)
  };
}
