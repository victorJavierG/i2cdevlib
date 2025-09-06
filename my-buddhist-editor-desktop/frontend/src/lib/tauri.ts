export async function logEdit(targetType: string, targetId: number, action: string) {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_log_edit", { targetType, targetId, action });
}

export async function createLink(fromType: string, fromId: number, toType: string, toId: number) {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_create_link", { fromType, fromId, toType, toId });
}

export async function getBacklinks(toType: string, toId: number): Promise<[string, number][]> {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_get_backlinks", { toType, toId }) as Promise<[string, number][]>;
}

