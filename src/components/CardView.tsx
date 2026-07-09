import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "../types";
import TagModal from "./TagModal";

interface CardViewProps {
  card: Card;
  readOnly: boolean;
  /** Rendered inside the DragOverlay: no sortable wiring, no editing. */
  overlay?: boolean;
  /** Disables drag (e.g. while a tag filter is active) without disabling editing. */
  dragDisabled?: boolean;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (index: number, lines: string[]) => void;
  onDescriptionAdd?: (lines: string[]) => void;
  onArchive?: () => void;
  onTagAdd?: (tag: string) => void;
  onTagUpdate?: (index: number, tag: string) => void;
  onTagRemove?: (index: number) => void;
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

interface TagComposerProps {
  onAdd: (tag: string) => void;
  onClose: () => void;
}

function TagComposer({ onAdd, onClose }: TagComposerProps) {
  const [text, setText] = useState("");

  function commit(close: boolean): void {
    const tag = text.trim();
    if (tag !== "") onAdd(tag);
    setText("");
    if (close || tag === "") onClose();
  }

  return (
    <input
      className="inline-edit tag-input"
      value={text}
      autoFocus
      placeholder="Tag"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => commit(true)}
      onKeyDown={(e) => {
        // Enter commits and keeps the composer open for rapid entry.
        if (e.key === "Enter") commit(false);
        if (e.key === "Escape") {
          setText("");
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
  dragDisabled = false,
  onTitleChange,
  onDescriptionChange,
  onDescriptionAdd,
  onArchive,
  onTagAdd,
  onTagUpdate,
  onTagRemove,
}: CardViewProps) {
  // "title" | description index | "new-note" | "new-tag" | null
  const [editing, setEditing] = useState<"title" | "new-note" | "new-tag" | number | null>(null);
  // Index of the tag whose edit/remove modal is open, or null.
  const [tagModal, setTagModal] = useState<number | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      disabled: readOnly || overlay || dragDisabled || editing !== null,
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
      {(card.tags.length > 0 || (!readOnly && !overlay)) && (
        <ul className="card-tags">
          {card.tags.map((tag, i) => (
            <li key={i}>
              {readOnly || overlay ? (
                <span className="card-tag">{tag}</span>
              ) : (
                <button
                  type="button"
                  className="card-tag card-tag-button"
                  title="Edit tag"
                  onClick={() => setTagModal(i)}
                >
                  {tag}
                </button>
              )}
            </li>
          ))}
          {!readOnly && !overlay && (
            <li>
              {editing === "new-tag" ? (
                <TagComposer onAdd={(tag) => onTagAdd?.(tag)} onClose={() => setEditing(null)} />
              ) : (
                <button
                  type="button"
                  className="card-add-tag"
                  onClick={() => setEditing("new-tag")}
                >
                  + tag
                </button>
              )}
            </li>
          )}
        </ul>
      )}
      {card.unknownProps.length > 0 && (
        <ul className="card-errors" role="alert">
          {card.unknownProps.map((prop, i) => (
            <li key={i} className="card-error">
              Unknown Property: {prop.title}
            </li>
          ))}
        </ul>
      )}
      {tagModal !== null && card.tags[tagModal] !== undefined && (
        <TagModal
          value={card.tags[tagModal]}
          onSave={(value) => {
            onTagUpdate?.(tagModal, value);
            setTagModal(null);
          }}
          onRemove={() => {
            onTagRemove?.(tagModal);
            setTagModal(null);
          }}
          onClose={() => setTagModal(null)}
        />
      )}
    </div>
  );
}

export default CardView;
