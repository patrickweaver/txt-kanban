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
  onDescriptionChange?: (index: number, lines: string[]) => void;
  onDescriptionAdd?: (lines: string[]) => void;
  onArchive?: () => void;
}

interface InlineEditProps {
  value: string;
  onCommit: (value: string) => void;
  onClose: () => void;
  /** Textarea with soft wrapping; Enter commits, Shift+Enter inserts a newline. */
  multiline?: boolean;
}

function autosize(el: HTMLTextAreaElement): void {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function InlineEdit({ value, onCommit, onClose, multiline = false }: InlineEditProps) {
  const [text, setText] = useState(value);
  const cancelled = useRef(false);

  function commit(): void {
    if (!cancelled.current && text.trim() !== value) onCommit(text.trim());
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    // Commit directly rather than via blur(); unmounting on close means
    // no blur event follows, so this cannot double-commit.
    if (e.key === "Enter" && !(multiline && e.shiftKey)) {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") {
      cancelled.current = true;
      onClose();
    }
  }

  if (multiline) {
    return (
      <textarea
        className="inline-edit"
        value={text}
        rows={1}
        autoFocus
        ref={(el) => {
          if (el) autosize(el);
        }}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setText(e.target.value);
          autosize(e.target);
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <input
      className="inline-edit"
      value={text}
      autoFocus
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

/** One nested list item per line; blank lines are dropped. */
function toNoteLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function CardView({
  card,
  readOnly,
  overlay = false,
  onTitleChange,
  onDescriptionChange,
  onDescriptionAdd,
  onArchive,
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
          <button className="card-delete" title="Delete card" onClick={onArchive}>
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
                  multiline
                  value={line}
                  onCommit={(text) => onDescriptionChange?.(i, toNoteLines(text))}
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
                multiline
                value=""
                onCommit={(text) => onDescriptionAdd?.(toNoteLines(text))}
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
