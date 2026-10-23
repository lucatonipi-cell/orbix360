import React, { useCallback, useRef, useState } from "react";

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error" | "cancelled";
  error?: string;
  thumbUrl: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function ImageUploader({
  productId,
  rowId,
  onUploaded,
}: {
  productId: string;
  rowId: string;
  onUploaded: (image: any) => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const xhrRefs = useRef<Record<string, XMLHttpRequest>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const overallProgress = items.length
    ? Math.round(items.reduce((sum, i) => sum + i.progress, 0) / items.length)
    : 0;

  const uploadFile = useCallback(
    (item: UploadItem) => {
      const form = new FormData();
      form.append("image", item.file, item.file.name);
      form.append("row_id", rowId);
      const xhr = new XMLHttpRequest();
      xhrRefs.current[item.id] = xhr;
      xhr.open("POST", `/api/products/${productId}/images`);
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const progress = Math.round((e.loaded / e.total) * 100);
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress, status: "uploading" } : i)));
      };
      xhr.onload = () => {
        delete xhrRefs.current[item.id];
        if (xhr.status >= 200 && xhr.status < 300) {
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, progress: 100, status: "done" } : i)));
          try {
            const response = JSON.parse(xhr.responseText);
            onUploaded(response.image);
          } catch {
            /* ignore parse error */
          }
        } else {
          let message = "Falha no upload";
          try {
            message = JSON.parse(xhr.responseText).error ?? message;
          } catch {
            /* ignore */
          }
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "error", error: message } : i)));
        }
      };
      xhr.onerror = () => {
        delete xhrRefs.current[item.id];
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "error", error: "Erro de rede" } : i)));
      };
      xhr.send(form);
    },
    [productId, rowId, onUploaded]
  );

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const newItems: UploadItem[] = [];
      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) continue;
        if (file.size > MAX_FILE_BYTES) continue;
        newItems.push({
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
          file,
          progress: 0,
          status: "queued",
          thumbUrl: URL.createObjectURL(file),
        });
      }
      setItems((prev) => [...prev, ...newItems]);
      newItems.forEach((item) => uploadFile(item));
    },
    [uploadFile]
  );

  const cancelItem = (id: string) => {
    xhrRefs.current[id]?.abort();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "cancelled" } : i)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div>
      <div
        className={`dropzone${isDragActive ? " is-active" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
      >
        <div className="dropzone-title">Arrasta as fotografias para aqui</div>
        <div>ou clica para selecionar (JPG, PNG, WEBP — várias de uma vez)</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <>
          <div style={{ marginTop: 16, fontSize: 13 }} className="muted">
            Progresso geral: {overallProgress}% ({items.filter((i) => i.status === "done").length}/{items.length})
          </div>
          <div className="upload-list">
            {items.map((item) => (
              <div className="upload-row" key={item.id}>
                <img className="upload-row-thumb" src={item.thumbUrl} alt="" />
                <div className="upload-row-name">{item.file.name}</div>
                <div className="upload-progress-track">
                  <div className="upload-progress-fill" style={{ width: `${item.progress}%` }} />
                </div>
                <div className="upload-row-status">
                  {item.status === "uploading" && `${item.progress}%`}
                  {item.status === "queued" && "Em fila"}
                  {item.status === "done" && "Concluído"}
                  {item.status === "error" && (item.error ?? "Erro")}
                  {item.status === "cancelled" && "Cancelado"}
                </div>
                {item.status === "uploading" || item.status === "queued" ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => cancelItem(item.id)} type="button">
                    Cancelar
                  </button>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.id)} type="button">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
