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

export type ParagraphRow = {
  id: number;
  section_id: number;
  order_index: number;
  text: string;
};

export type CommentaryRow = {
  id: number;
  paragraph_id: number;
  section_id: number | null;
  text: string;
  created_at: number;
};

export async function listParagraphs(): Promise<ParagraphRow[]> {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_list_paragraphs") as Promise<ParagraphRow[]>;
}

export async function createParagraph(text: string): Promise<ParagraphRow> {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_create_paragraph", { text }) as Promise<ParagraphRow>;
}

export async function updateParagraph(id: number, text: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_update_paragraph", { id, text }) as Promise<void>;
}

export async function listCommentaries(paragraphId: number): Promise<CommentaryRow[]> {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_list_commentaries", { paragraphId }) as Promise<CommentaryRow[]>;
}

export async function createCommentary(paragraphId: number, text: string): Promise<CommentaryRow> {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_create_commentary", { paragraphId, text }) as Promise<CommentaryRow>;
}

export async function updateCommentary(id: number, text: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_update_commentary", { id, text }) as Promise<void>;
}

export async function enrollParagraphForReview(paragraphId: number): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_enroll_paragraph_for_review", { paragraphId }) as Promise<void>;
}

export async function listDueParagraphs(limit: number): Promise<ParagraphRow[]> {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_list_due_paragraphs", { limit }) as Promise<ParagraphRow[]>;
}

export async function registerReviewResponseForParagraph(paragraphId: number, grade: "hard" | "good" | "easy"): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/tauri");
  return invoke("cmd_register_review_response_for_paragraph", { paragraphId, grade }) as Promise<void>;
}

