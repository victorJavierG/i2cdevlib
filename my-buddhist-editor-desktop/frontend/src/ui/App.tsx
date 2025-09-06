import { useMemo, useState } from "react";

type Paragraph = {
  id: string;
  order: number;
  text: string;
};

type Commentary = {
  id: string;
  paragraphId: string;
  text: string;
};

export function App() {
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([
    { id: "p1", order: 1, text: "Enseñanza principal: ..." },
    { id: "p2", order: 2, text: "Otra enseñanza: ..." }
  ]);
  const [commentaries, setCommentaries] = useState<Commentary[]>([]);
  const [selectedParagraphId, setSelectedParagraphId] = useState<string>("p1");

  const selectedParagraph = useMemo(
    () => paragraphs.find(p => p.id === selectedParagraphId),
    [paragraphs, selectedParagraphId]
  );

  const relatedComments = useMemo(
    () => commentaries.filter(c => c.paragraphId === selectedParagraphId),
    [commentaries, selectedParagraphId]
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100vh" }}>
      <div style={{ padding: 16, borderRight: "1px solid #ddd", overflow: "auto" }}>
        <h2>Autor</h2>
        <ol>
          {paragraphs
            .sort((a, b) => a.order - b.order)
            .map(p => (
              <li key={p.id} style={{ marginBottom: 12 }}>
                <button onClick={() => setSelectedParagraphId(p.id)} style={{ fontWeight: p.id === selectedParagraphId ? 700 : 400 }}>
                  {p.text}
                </button>
              </li>
            ))}
        </ol>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => {
              const id = `p${Date.now()}`;
              setParagraphs(prev => [...prev, { id, order: prev.length + 1, text: "Nuevo párrafo" }]);
              setSelectedParagraphId(id);
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
          {relatedComments.map(c => (
            <li key={c.id} style={{ marginBottom: 8 }}>{c.text}</li>
          ))}
        </ul>
        <div>
          <button
            onClick={() => {
              if (!selectedParagraphId) return;
              const id = `c${Date.now()}`;
              setCommentaries(prev => [...prev, { id, paragraphId: selectedParagraphId, text: "Nuevo comentario" }]);
            }}
          >
            Añadir comentario
          </button>
        </div>
      </div>
    </div>
  );
}

