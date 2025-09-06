import { useEffect, useMemo, useState } from "react";
import {
  listParagraphs,
  createParagraph,
  updateParagraph,
  listCommentaries,
  createCommentary,
  updateCommentary,
  type ParagraphRow,
  type CommentaryRow
} from "../lib/tauri";

export function App() {
  const [paragraphs, setParagraphs] = useState<ParagraphRow[]>([]);
  const [selectedParagraphId, setSelectedParagraphId] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentaryRow[]>([]);

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
      <div style={{ padding: 16, borderRight: "1px solid #ddd", overflow: "auto" }}>
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
        <div style={{ marginTop: 16 }}>
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
        </div>
      </div>

      <div style={{ padding: 16, overflow: "auto" }}>
        <h2>Comentarios</h2>
        {selectedParagraph && (
          <div style={{ marginBottom: 12, color: "#555" }}>
            <div style={{ fontSize: 12 }}>Párrafo seleccionado</div>
            <div>“{selectedParagraph.text}”</div>
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
    </div>
  );
}

