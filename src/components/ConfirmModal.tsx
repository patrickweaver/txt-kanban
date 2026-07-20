import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * A yes/no confirmation. Portaled like the other modals; Escape or a backdrop
 * click cancels, and Confirm holds focus so Enter confirms.
 */
function ConfirmModal({ message, onConfirm, onClose }: ConfirmModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-save" autoFocus onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmModal;
