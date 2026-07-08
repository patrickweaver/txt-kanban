import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "../types";

interface CardViewProps {
  card: Card;
  readOnly: boolean;
  /** Rendered inside the DragOverlay: no sortable wiring, no editing. */
  overlay?: boolean;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (index: number, text: string) => void;
  onDescriptionAdd?: (text: string) => void;
  onDelete?: () => void;
}

interface InlineEditProps {
  value: string;
  onCommit: (value: string) => void;
  onClose: () => void;
}

function InlineEdit({ value, onCommit, onClose }: InlineEditProps) {
  const [text, setText] = useState(value);
  const cancelled = useRef(false);

  function commit(): void {
    if (!cancelled.current && text.trim() !== value) onCommit(text.trim());
    onClose();
  }

  return (
    <input
      className="inline-edit"
      value={text}
      autoFocus
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        // Commit directly rather than via blur(); unmounting on close means
        // no blur event follows, so this cannot double-commit.
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          cancelled.current = true;
          onClose();
        }
      }}
    />
  );
}

function CardView({
  card,
  readOnly,
  overlay = false,
  onTitleChange,
  onDescriptionChange,
  onDescriptionAdd,
  onDelete,
}: CardViewProps) {
  // "title" | description index | "new-note" | null
  const [editing, setEditing] = useState<"title" | "new-note" | number | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      disabled: readOnly || overlay || editing !== null,
    });

  const style = overlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={`card${isDragging ? " card-dragging" : ""}${overlay ? " card-overlay" : ""}`}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
    >
      <div className="card-header">
        {editing === "title" ? (
          <InlineEdit
            value={card.title}
            onCommit={(text) => text !== "" && onTitleChange?.(text)}
            onClose={() => setEditing(null)}
          />
        ) : (
          <span
            className="card-title"
            onClick={readOnly || overlay ? undefined : () => setEditing("title")}
          >
            {card.title}
          </span>
        )}
        {!readOnly && !overlay && (
          <button className="card-delete" title="Delete card" onClick={onDelete}>
            ×
          </button>
        )}
      </div>
      {(card.description.length > 0 || editing === "new-note") && (
        <ul className="card-description">
          {card.description.map((line, i) =>
            editing === i ? (
              <li key={i}>
                <InlineEdit
                  value={line}
                  onCommit={(text) => onDescriptionChange?.(i, text)}
                  onClose={() => setEditing(null)}
                />
              </li>
            ) : (
              <li
                key={i}
                onClick={readOnly || overlay ? undefined : () => setEditing(i)}
              >
                {line}
              </li>
            )
          )}
          {editing === "new-note" && (
            <li>
              <InlineEdit
                value=""
                onCommit={(text) => text !== "" && onDescriptionAdd?.(text)}
                onClose={() => setEditing(null)}
              />
            </li>
          )}
        </ul>
      )}
      {!readOnly && !overlay && card.description.length === 0 && editing !== "new-note" && (
        <button className="card-add-note" onClick={() => setEditing("new-note")}>
          + note
        </button>
      )}
    </div>
  );
}

export default CardView;
