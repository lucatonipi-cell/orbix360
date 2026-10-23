import React, { useState } from "react";

export interface FrameItem {
  id: string;
  thumbnailUrl: string;
}

export function FrameTimeline({
  frames,
  onReorder,
  onRemove,
}: {
  frames: FrameItem[];
  onReorder: (orderedIds: string[]) => void;
  onRemove: (id: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const ids = frames.map((f) => f.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    onReorder(ids);
    setDragId(null);
    setOverId(null);
  };

  if (frames.length === 0) {
    return <p className="muted">Ainda sem frames. Faz upload de imagens acima.</p>;
  }

  return (
    <div className="frame-timeline">
      {frames.map((frame, index) => (
        <div
          key={frame.id}
          className={`frame-tile${dragId === frame.id ? " dragging" : ""}${overId === frame.id ? " drop-target" : ""}`}
          draggable
          onDragStart={() => setDragId(frame.id)}
          onDragOver={(e) => {
            e.preventDefault();
            setOverId(frame.id);
          }}
          onDragLeave={() => setOverId((cur) => (cur === frame.id ? null : cur))}
          onDrop={() => handleDrop(frame.id)}
          title="Arrasta para reordenar · duplo clique para remover"
          onDoubleClick={() => onRemove(frame.id)}
        >
          <img src={frame.thumbnailUrl} alt={`Frame ${index + 1}`} draggable={false} />
          <span className="frame-tile-index">{String(index + 1).padStart(2, "0")}</span>
        </div>
      ))}
    </div>
  );
}
