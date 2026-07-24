import { useState } from "react";
import { createPortal } from "react-dom";

interface TagModalProps {
  value: string;
  onSave: (value: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

/**
 * Edit or remove a single tag. Rendered in a portal so it escapes the card's
 * stacking/overflow. Save is disabled while the field is empty; Remove deletes
 * the tag outright. Escape or a backdrop click cancels.
 */
function TagModal({ value, onSave, onRemove, onClose }: TagModalProps) {
  const [text, setText] = useState(value);
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
        aria-label="Edit tag"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          className="inline-edit modal-input"
          value={text}
          autoFocus
          onFocus={(e) => e.target.select()}
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
          <button className="modal-remove" onClick={onRemove}>
            Remove
          </button>
          <button
            className="modal-save"
            onClick={save}
            disabled={trimmed === ""}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default TagModal;
