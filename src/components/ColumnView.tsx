import { useEffect, useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Column } from "../types";
import CardView from "./CardView";
import ConfirmModal from "./ConfirmModal";

interface ColumnViewProps {
  column: Column;
  readOnly: boolean;
  /** Disables card dragging (e.g. while a tag filter is active). */
  dragDisabled?: boolean;
  /** Card that should open its description editor once (just added). */
  autoEditCardId?: string | null;
  onCardTitleChange: (cardId: string, title: string) => void;
  onCardDescriptionChange: (cardId: string, text: string) => void;
  onCardArchive: (cardId: string) => void;
  onCardAdd: (title: string) => void;
  onCardTagAdd: (cardId: string, tag: string) => void;
  onCardTagUpdate: (cardId: string, index: number, tag: string) => void;
  onCardTagRemove: (cardId: string, index: number) => void;
  onAutoEditConsumed: () => void;
  /** Permanently removes this (empty) column. */
  onRemove: () => void;
}

interface ComposerProps {
  onAdd: (title: string) => void;
  onClose: () => void;
}

function Composer({ onAdd, onClose }: ComposerProps) {
  const [text, setText] = useState("");

  function commit(close: boolean): void {
    const title = text.trim();
    if (title !== "") onAdd(title);
    setText("");
    if (close || title === "") onClose();
  }

  return (
    <input
      className="inline-edit"
      value={text}
      autoFocus
      placeholder="Card title"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => commit(true)}
      onKeyDown={(e) => {
        // Enter commits and closes so focus flows into the new card's editor.
        if (e.key === "Enter") commit(true);
        if (e.key === "Escape") {
          setText("");
          onClose();
        }
      }}
    />
  );
}

function ColumnView({
  column,
  readOnly,
  dragDisabled,
  autoEditCardId,
  onCardTitleChange,
  onCardDescriptionChange,
  onCardArchive,
  onCardAdd,
  onCardTagAdd,
  onCardTagUpdate,
  onCardTagRemove,
  onAutoEditConsumed,
  onRemove,
}: ColumnViewProps) {
  const [composing, setComposing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  // True from pointer-down on the handle until release, so the column shows
  // its active color the moment a drag *could* start, not 8px later.
  const [pressed, setPressed] = useState(false);
  const canDrag = !readOnly && !dragDisabled;
  // The whole column is sortable (dragged by its header). Its droppable
  // doubles as the drop target that lets cards land in an empty column.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: column.id,
      data: { type: "column" },
      disabled: !canDrag,
    });

  // Release anywhere ends the pressed state, including clicks that never
  // became a drag.
  useEffect(() => {
    if (!pressed) return;
    const clear = () => setPressed(false);
    window.addEventListener("pointerup", clear);
    window.addEventListener("pointercancel", clear);
    return () => {
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("pointercancel", clear);
    };
  }, [pressed]);

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`column${pressed || isDragging ? " column-active" : ""}${
        isDragging ? " column-dragging" : ""
      }`}
    >
      <div className="column-header">
        <h2
          className={`column-name${canDrag ? " column-drag-handle" : ""}`}
          {...attributes}
          {...listeners}
          onPointerDown={
            canDrag
              ? (e: React.PointerEvent<HTMLHeadingElement>) => {
                  listeners?.onPointerDown?.(e);
                  setPressed(true);
                }
              : undefined
          }
        >
          {column.name}
        </h2>
        {!readOnly && !dragDisabled && column.cards.length === 0 && (
          <button
            className="column-delete"
            title="Remove column"
            onClick={() => setConfirmingRemove(true)}
          >
            ×
          </button>
        )}
      </div>
      <SortableContext
        items={column.cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="column-cards">
          {column.cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              readOnly={readOnly}
              dragDisabled={dragDisabled}
              autoEdit={autoEditCardId === card.id}
              onTitleChange={(title) => onCardTitleChange(card.id, title)}
              onDescriptionChange={(text) => onCardDescriptionChange(card.id, text)}
              onArchive={() => onCardArchive(card.id)}
              onTagAdd={(tag) => onCardTagAdd(card.id, tag)}
              onTagUpdate={(i, tag) => onCardTagUpdate(card.id, i, tag)}
              onTagRemove={(i) => onCardTagRemove(card.id, i)}
              onAutoEditConsumed={onAutoEditConsumed}
            />
          ))}
        </div>
      </SortableContext>
      {!readOnly &&
        (composing ? (
          <Composer onAdd={onCardAdd} onClose={() => setComposing(false)} />
        ) : (
          <button className="column-add-card" onClick={() => setComposing(true)}>
            + Add card
          </button>
        ))}
      {confirmingRemove && (
        <ConfirmModal
          message={`Remove the "${column.name}" column? This cannot be undone.`}
          onConfirm={() => {
            onRemove();
            setConfirmingRemove(false);
          }}
          onClose={() => setConfirmingRemove(false)}
        />
      )}
    </section>
  );
}

/**
 * The copy of a column carried by the DragOverlay while it is dragged. Pure
 * markup — no sortable wiring — so it can't fight the real column's
 * registrations.
 */
export function ColumnOverlay({ column }: { column: Column }) {
  return (
    <section className="column column-active column-overlay">
      <h2 className="column-name">{column.name}</h2>
      <div className="column-cards">
        {column.cards.map((card) => (
          <CardView key={card.id} card={card} readOnly overlay />
        ))}
      </div>
    </section>
  );
}

export default ColumnView;
