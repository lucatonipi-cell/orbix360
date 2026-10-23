import React, { useMemo, useState } from "react";
import { Viewer360, type Viewer360Settings, type Viewer360Row } from "./Viewer360";
import { ImageUploader } from "./ImageUploader";
import { FrameTimeline } from "./FrameTimeline";
import { SequenceSettingsPanel } from "./SequenceSettingsPanel";

export interface EditorImage {
  id: string;
  row_id: string;
  thumbnail_url: string;
  medium_url: string;
  large_url: string;
  sort_order: number;
}

export interface EditorRow {
  id: string;
  label: string;
  row_order: number;
}

export interface EditorSequence {
  auto_rotate: number;
  rotate_speed: "slow" | "normal" | "fast";
  zoom_enabled: number;
  fullscreen_enabled: number;
  controls_enabled: number;
  background: string;
}

function toViewerSettings(seq: EditorSequence): Viewer360Settings {
  return {
    autoRotate: !!seq.auto_rotate,
    rotateSpeed: seq.rotate_speed,
    zoomEnabled: !!seq.zoom_enabled,
    fullscreenEnabled: !!seq.fullscreen_enabled,
    controlsEnabled: !!seq.controls_enabled,
    background: seq.background,
  };
}

export function ProductEditorApp({
  productId,
  initialImages,
  initialRows,
  initialSequence,
}: {
  productId: string;
  initialImages: EditorImage[];
  initialRows: EditorRow[];
  initialSequence: EditorSequence;
}) {
  const [images, setImages] = useState<EditorImage[]>(
    [...initialImages].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [rows, setRows] = useState<EditorRow[]>(
    [...initialRows].sort((a, b) => a.row_order - b.row_order)
  );
  const [activeRowId, setActiveRowId] = useState<string | null>(rows[0]?.id ?? null);
  const [addingRow, setAddingRow] = useState(false);
  const [newRowLabel, setNewRowLabel] = useState("");
  const [settings, setSettings] = useState<Viewer360Settings>(toViewerSettings(initialSequence));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const imagesByRow = useMemo(() => {
    const map = new Map<string, EditorImage[]>();
    for (const row of rows) map.set(row.id, []);
    for (const img of images) {
      if (!map.has(img.row_id)) map.set(img.row_id, []);
      map.get(img.row_id)!.push(img);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [images, rows]);

  const viewerRows: Viewer360Row[] = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        label: row.label,
        frames: (imagesByRow.get(row.id) ?? []).map((img) => ({
          thumbnailUrl: img.thumbnail_url,
          mediumUrl: img.medium_url,
          largeUrl: img.large_url,
        })),
      })),
    [rows, imagesByRow]
  );

  const activeRow = rows.find((r) => r.id === activeRowId) ?? rows[0] ?? null;

  const reorder = async (rowId: string, orderedIds: string[]) => {
    const rowImages = imagesByRow.get(rowId) ?? [];
    const map = new Map(rowImages.map((i) => [i.id, i]));
    const reordered = orderedIds.map((id, index) => ({ ...map.get(id)!, sort_order: index }));
    setImages((prev) => [...prev.filter((i) => i.row_id !== rowId), ...reordered]);
    await fetch(`/api/products/${productId}/images/reorder`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rowId, orderedIds }),
    });
  };

  const removeFrame = async (imageId: string) => {
    setImages((prev) => prev.filter((i) => i.id !== imageId));
    await fetch(`/api/products/${productId}/images/${imageId}`, { method: "DELETE" });
  };

  const refreshImages = async () => {
    // The server re-applies natural filename ordering after every upload
    // (uploads race concurrently), so re-fetch the canonical order instead
    // of trusting client-side arrival order.
    const res = await fetch(`/api/products/${productId}/images`);
    if (!res.ok) return;
    const { images: fresh } = await res.json();
    setImages(
      (fresh as any[]).map((img) => ({
        id: img.id,
        row_id: img.row_id,
        thumbnail_url: img.thumbnail_url,
        medium_url: img.medium_url,
        large_url: img.large_url,
        sort_order: img.sort_order,
      }))
    );
  };

  const createRow = async () => {
    const label = newRowLabel.trim();
    if (!label) return;
    const res = await fetch(`/api/products/${productId}/rows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      const { row } = await res.json();
      setRows((prev) => [...prev, row]);
      setActiveRowId(row.id);
    }
    setNewRowLabel("");
    setAddingRow(false);
  };

  const removeRow = async (rowId: string) => {
    if (rows.length <= 1) return;
    if (!window.confirm("Eliminar este ângulo e todas as suas fotografias?")) return;
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setImages((prev) => prev.filter((i) => i.row_id !== rowId));
    if (activeRowId === rowId) {
      setActiveRowId((prev) => rows.find((r) => r.id !== rowId)?.id ?? null);
    }
    await fetch(`/api/products/${productId}/rows/${rowId}`, { method: "DELETE" });
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/products/${productId}/360`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          frame_count: images.length,
          auto_rotate: settings.autoRotate,
          rotate_speed: settings.rotateSpeed,
          zoom_enabled: settings.zoomEnabled,
          fullscreen_enabled: settings.fullscreenEnabled,
          controls_enabled: settings.controlsEnabled,
          background: settings.background,
        }),
      });
      setSavedAt(Date.now());
      (window as any).OrbixToast?.("Definições guardadas.", "success");
    } finally {
      setSaving(false);
    }
  };

  const activeRowImages = activeRow ? imagesByRow.get(activeRow.id) ?? [] : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }} className="editor-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="card card-padded">
          <div className="section-heading">
            <h2>Pré-visualização</h2>
          </div>
          <Viewer360 rows={viewerRows} settings={settings} />
          {rows.length > 1 && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              {rows.length} ângulos · arrasta na vertical para alternar entre eles.
            </p>
          )}
        </div>

        <div className="card card-padded">
          <div className="section-heading">
            <h2>Ângulos (eixos)</h2>
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Cada ângulo é um anel de fotografias tiradas a uma altura diferente (ex.: "Nível",
            "De cima", "De baixo"). Faz upload de um grupo de fotografias de cada vez, escolhendo
            a que ângulo pertencem.
          </p>
          <div className="row-tabs">
            {rows.map((row) => (
              <div key={row.id} className={`row-tab${activeRow?.id === row.id ? " active" : ""}`}>
                <button type="button" className="row-tab-label" onClick={() => setActiveRowId(row.id)}>
                  {row.label}
                  <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                    ({(imagesByRow.get(row.id) ?? []).length})
                  </span>
                </button>
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="row-tab-remove"
                    title="Eliminar ângulo"
                    onClick={() => removeRow(row.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {addingRow ? (
              <div className="row-tab row-tab-new">
                <input
                  autoFocus
                  className="row-tab-input"
                  placeholder="Nome do ângulo"
                  value={newRowLabel}
                  onChange={(e) => setNewRowLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createRow();
                    if (e.key === "Escape") {
                      setAddingRow(false);
                      setNewRowLabel("");
                    }
                  }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={createRow}>
                  Criar
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddingRow(true)}>
                + Novo ângulo
              </button>
            )}
          </div>
        </div>

        {activeRow && (
          <div className="card card-padded">
            <div className="section-heading">
              <h2>Upload — {activeRow.label}</h2>
            </div>
            <ImageUploader key={activeRow.id} productId={productId} rowId={activeRow.id} onUploaded={refreshImages} />
          </div>
        )}

        {activeRow && (
          <div className="card card-padded">
            <div className="section-heading">
              <h2>
                Frames de "{activeRow.label}" ({activeRowImages.length})
              </h2>
            </div>
            <FrameTimeline
              frames={activeRowImages.map((i) => ({ id: i.id, thumbnailUrl: i.thumbnail_url }))}
              onReorder={(orderedIds) => reorder(activeRow.id, orderedIds)}
              onRemove={removeFrame}
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SequenceSettingsPanel frameCount={images.length} settings={settings} onChange={setSettings} />
        <button className="btn btn-primary" onClick={save} disabled={saving} type="button">
          {saving ? "A guardar…" : "Save changes"}
        </button>
        {savedAt && <p className="muted" style={{ fontSize: 12 }}>Guardado.</p>}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .editor-grid { grid-template-columns: 1fr !important; }
        }
        .row-tabs { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .row-tab {
          display: flex; align-items: center; gap: 2px;
          border: 1px solid var(--color-border); border-radius: 999px; overflow: hidden;
        }
        .row-tab.active { border-color: var(--color-primary); }
        .row-tab-label { border: none; background: transparent; padding: 7px 12px; cursor: pointer; font-size: 13px; }
        .row-tab.active .row-tab-label { background: var(--color-primary); color: #fff; }
        .row-tab-remove { border: none; background: transparent; cursor: pointer; padding: 6px 8px; color: var(--color-text-muted); }
        .row-tab-new { padding: 2px 6px; gap: 6px; }
        .row-tab-input { border: none; outline: none; font-size: 13px; padding: 6px 4px; width: 120px; }
      `}</style>
    </div>
  );
}
