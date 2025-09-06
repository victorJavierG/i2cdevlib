import { useEffect, useMemo, useState } from "react";
import {
  listParagraphs,
  createParagraph,
  updateParagraph,
  listCommentaries,
  createCommentary,
  updateCommentary,
  createLink,
  getBacklinks,
  enrollParagraphForReview,
  listDueParagraphs,
  registerReviewResponseForParagraph,
  type ParagraphRow,
  type CommentaryRow
} from "../lib/tauri";

export function App() {
  const [paragraphs, setParagraphs] = useState<ParagraphRow[]>([]);
  const [selectedParagraphId, setSelectedParagraphId] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentaryRow[]>([]);
  const [backlinks, setBacklinks] = useState<[string, number][]>([]);
  const [linkTargetParagraphId, setLinkTargetParagraphId] = useState<number | null>(null);
  const [tab, setTab] = useState<"editor" | "review">("editor");
  const [dueItems, setDueItems] = useState<ParagraphRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const ps = await listParagraphs();
        setParagraphs(ps);
        if (ps.length > 0) setSelectedParagraphId(ps[0].id);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (selectedParagraphId == null) return;
      try {
        const cs = await listCommentaries(selectedParagraphId);
        setComments(cs);
        const bl = await getBacklinks("paragraph", selectedParagraphId);
        setBacklinks(bl);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [selectedParagraphId]);

  const selectedParagraph = useMemo(
    () => paragraphs.find(p => p.id === selectedParagraphId ?? -1),
    [paragraphs, selectedParagraphId]
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100vh" }}>
      <div style={{ gridColumn: "1 / span 2", padding: 8, borderBottom: "1px solid #ddd", display: "flex", gap: 8 }}>
        <button onClick={() => setTab("editor")} style={{ fontWeight: tab === "editor" ? 700 : 400 }}>Editor</button>
        <button onClick={async () => { setTab("review"); const items = await listDueParagraphs(20); setDueItems(items); }} style={{ fontWeight: tab === "review" ? 700 : 400 }}>Lectura diaria</button>
      </div>
      <div style={{ padding: 16, borderRight: "1px solid #ddd", overflow: "auto", display: tab === "editor" ? "block" : "none" }}>
        <h2>Autor</h2>
        <ol>
          {paragraphs
            .sort((a, b) => a.order_index - b.order_index)
            .map(p => (
              <li key={p.id} style={{ marginBottom: 12 }}>
                <button onClick={() => setSelectedParagraphId(p.id)} style={{ fontWeight: p.id === selectedParagraphId ? 700 : 400 }}>
                  {p.text}
                </button>
                <div>
                  <textarea
                    value={p.text}
                    onChange={async (e) => {
                      const newText = e.target.value;
                      try {
                        await updateParagraph(p.id, newText);
                        setParagraphs(prev => prev.map(x => x.id === p.id ? { ...x, text: newText } : x));
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    rows={3}
                    style={{ width: "100%", marginTop: 8 }}
                  />
                </div>
              </li>
            ))}
        </ol>
        <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={async () => {
              try {
                const created = await createParagraph("Nuevo párrafo");
                setParagraphs(prev => [...prev, created]);
                setSelectedParagraphId(created.id);
              } catch (err) {
                console.error(err);
              }
            }}
          >
            Añadir párrafo
          </button>
          {selectedParagraphId != null && (
            <button
              onClick={async () => {
                try {
                  await enrollParagraphForReview(selectedParagraphId);
                  alert("Párrafo inscrito en Lectura diaria");
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              Inscribir en Lectura diaria
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 16, overflow: "auto", display: tab === "editor" ? "block" : "none" }}>
        <h2>Comentarios</h2>
        {selectedParagraph && (
          <div style={{ marginBottom: 12, color: "#555" }}>
            <div style={{ fontSize: 12 }}>Párrafo seleccionado</div>
            <div>“{selectedParagraph.text}”</div>
          </div>
        )}
        {selectedParagraph && (
          <div style={{ marginBottom: 20, padding: 12, border: "1px solid #eee", borderRadius: 6 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Enlaces a este párrafo (backlinks)</div>
            {backlinks.length === 0 ? (
              <div style={{ color: "#888" }}>Sin backlinks aún.</div>
            ) : (
              <ul>
                {backlinks.map(([fromType, fromId]) => {
                  const label = fromType === "paragraph"
                    ? `Párrafo #${fromId}: ${paragraphs.find(p => p.id === fromId)?.text ?? "(texto no cargado)"}`
                    : `Comentario #${fromId}`;
                  return (
                    <li key={`${fromType}-${fromId}`} style={{ marginBottom: 6 }}>{label}</li>
                  );
                })}
              </ul>
            )}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Crear enlace desde este párrafo hacia:</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={linkTargetParagraphId ?? ""}
                  onChange={(e) => setLinkTargetParagraphId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Selecciona un párrafo…</option>
                  {paragraphs
                    .filter(p => p.id !== selectedParagraphId)
                    .sort((a, b) => a.order_index - b.order_index)
                    .map(p => (
                      <option key={p.id} value={p.id}>{`#${p.id} · ${p.text.slice(0, 60)}`}</option>
                    ))}
                </select>
                <button
                  onClick={async () => {
                    if (selectedParagraphId == null || linkTargetParagraphId == null) return;
                    try {
                      await createLink("paragraph", selectedParagraphId, "paragraph", linkTargetParagraphId);
                      const bl = await getBacklinks("paragraph", selectedParagraphId);
                      setBacklinks(bl);
                      setLinkTargetParagraphId(null);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  disabled={selectedParagraphId == null || linkTargetParagraphId == null}
                >
                  Crear enlace
                </button>
              </div>
            </div>
          </div>
        )}
        <ul>
          {comments.map(c => (
            <li key={c.id} style={{ marginBottom: 12 }}>
              <textarea
                value={c.text}
                onChange={async (e) => {
                  const newText = e.target.value;
                  try {
                    await updateCommentary(c.id, newText);
                    setComments(prev => prev.map(x => x.id === c.id ? { ...x, text: newText } : x));
                  } catch (err) {
                    console.error(err);
                  }
                }}
                rows={3}
                style={{ width: "100%" }}
              />
            </li>
          ))}
        </ul>
        <div>
          <button
            onClick={async () => {
              if (selectedParagraphId == null) return;
              try {
                const created = await createCommentary(selectedParagraphId, "Nuevo comentario");
                setComments(prev => [...prev, created]);
              } catch (err) {
                console.error(err);
              }
            }}
          >
            Añadir comentario
          </button>
        </div>
      </div>

      <div style={{ gridColumn: "1 / span 2", padding: 16, display: tab === "review" ? "block" : "none" }}>
        <h2>Lectura diaria</h2>
        {dueItems.length === 0 ? (
          <div style={{ color: "#888" }}>No hay elementos vencidos. Inscribe párrafos desde el editor.</div>
        ) : (
          dueItems.map(item => (
            <div key={item.id} style={{ marginBottom: 16, padding: 12, border: "1px solid #eee", borderRadius: 6 }}>
              <div style={{ marginBottom: 8 }}>{item.text}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async () => { await registerReviewResponseForParagraph(item.id, "hard"); const items = await listDueParagraphs(20); setDueItems(items); }}>Hard</button>
                <button onClick={async () => { await registerReviewResponseForParagraph(item.id, "good"); const items = await listDueParagraphs(20); setDueItems(items); }}>Good</button>
                <button onClick={async () => { await registerReviewResponseForParagraph(item.id, "easy"); const items = await listDueParagraphs(20); setDueItems(items); }}>Easy</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

