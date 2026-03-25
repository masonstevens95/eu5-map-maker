import { useCallback } from "react";

interface DropZoneProps {
  loading: boolean;
  loadingMessage: string;
  onFile: (file: File) => void;
}

export function DropZone({ loading, loadingMessage, onFile }: DropZoneProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      className={`drop-zone ${loading ? "loading" : ""}`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {loading ? (
        <div className="spinner-container">
          <div className="spinner" />
          <p>{loadingMessage}</p>
        </div>
      ) : (
        <>
          <div className="drop-icon">&#128506;</div>
          <p>Drop an EU5 save file here or click to browse</p>
          <p className="hint">
            Supports both binary (.eu5) and pre-melted (.txt) saves
          </p>
          <input
            type="file"
            accept=".txt,.eu5"
            onChange={handleInputChange}
            className="file-input"
          />
        </>
      )}
    </div>
  );
}
