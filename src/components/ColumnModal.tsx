import { useState } from "react";
import { createPortal } from "react-dom";
import { reservedColumnReason } from "../boardOps";

interface ColumnModalProps {
  onSave: (name: string) => void;
  onClose: () => void;
}

/**
 * Names and creates a new column. Portaled so it escapes the header's layout.
 * Save is disabled while the field is empty or names a reserved section;
 * Escape or a backdrop click cancels.
 */
function ColumnModal({ onSave, onClose }: ColumnModalProps) {
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const reserved = trimmed === "" ? null : reservedColumnReason(trimmed);
  const canSave = trimmed !== "" && reserved === null;

  function save(): void {
    if (canSave) onSave(trimmed);
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="New column"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          className="inline-edit modal-input"
          value={text}
          autoFocus
          placeholder="Column name"
          aria-invalid={reserved !== null}
          aria-describedby={reserved ? "column-name-error" : undefined}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") onClose();
          }}
        />
        {reserved && (
          <p className="modal-error" id="column-name-error" role="alert">
            {reserved}
          </p>
        )}
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-save" onClick={save} disabled={!canSave}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ColumnModal;
