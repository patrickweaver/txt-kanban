import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "../types";
import { formatDateTime, parseCardDate } from "../boardOps";
import TagModal from "./TagModal";

interface CardViewProps {
  card: Card;
  readOnly: boolean;
  /** Rendered inside the DragOverlay: no sortable wiring, no editing. */
  overlay?: boolean;
  /** Disables drag (e.g. while a tag filter is active) without disabling editing. */
  dragDisabled?: boolean;
  /** Just added via the composer: open its description editor once. */
  autoEdit?: boolean;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (text: string) => void;
  onArchive?: () => void;
  onTagAdd?: (tag: string) => void;
  onTagUpdate?: (index: number, tag: string) => void;
  onTagRemove?: (index: number) => void;
  onAutoEditConsumed?: () => void;
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
  autoEdit = false,
  onTitleChange,
  onDescriptionChange,
  onArchive,
  onTagAdd,
  onTagUpdate,
  onTagRemove,
  onAutoEditConsumed,
}: CardViewProps) {
  // A card just added via the composer mounts with its description editor open
  // (adding the card and flagging it happen in the same parent render), so
  // Enter on the title flows straight into writing the description.
  const [editing, setEditing] = useState<"title" | "description" | "new-tag" | null>(
    autoEdit ? "description" : null
  );
  // Index of the tag whose edit/remove modal is open, or null.
  const [tagModal, setTagModal] = useState<number | null>(null);

  // Clear the parent's flag so a later remount (e.g. after a cross-column
  // drag) doesn't reopen the editor.
  useEffect(() => {
    if (autoEdit) onAutoEditConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit]);

  const cardDate = card.date !== null ? parseCardDate(card.date) : null;

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
      {cardDate !== null && (
        <div className="card-date">{formatDateTime(new Date(cardDate))}</div>
      )}
      {editing === "description" ? (
        <div className="card-description">
          <InlineEdit
            multiline
            value={card.description}
            onCommit={(text) => onDescriptionChange?.(text)}
            onClose={() => setEditing(null)}
          />
        </div>
      ) : (
        card.description !== "" && (
          <p
            className="card-description"
            onClick={readOnly || overlay ? undefined : () => setEditing("description")}
          >
            {card.description}
          </p>
        )
      )}
      {!readOnly && !overlay && card.description === "" && editing !== "description" && (
        <button className="card-add-note" onClick={() => setEditing("description")}>
          + description
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
