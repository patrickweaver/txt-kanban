import { useState } from "react";
import { createPortal } from "react-dom";

interface ColumnModalProps {
  onSave: (name: string) => void;
  onClose: () => void;
}

/**
 * Names and creates a new column. Portaled so it escapes the header's layout.
 * Save is disabled while the field is empty; Escape or a backdrop click cancels.
 */
function ColumnModal({ onSave, onClose }: ColumnModalProps) {
  const [text, setText] = useState("");
  const trimmed = text.trim();

  function save(): void {
    if (trimmed !== "") onSave(trimmed);
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
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-save" onClick={save} disabled={trimmed === ""}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ColumnModal;
