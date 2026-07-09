import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Column } from "../types";
import CardView from "./CardView";

interface ColumnViewProps {
  column: Column;
  readOnly: boolean;
  onCardTitleChange: (cardId: string, title: string) => void;
  onCardDescriptionChange: (cardId: string, index: number, lines: string[]) => void;
  onCardDescriptionAdd: (cardId: string, lines: string[]) => void;
  onCardArchive: (cardId: string) => void;
  onCardAdd: (title: string) => void;
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

function ColumnView({
  column,
  readOnly,
  onCardTitleChange,
  onCardDescriptionChange,
  onCardDescriptionAdd,
  onCardArchive,
  onCardAdd,
}: ColumnViewProps) {
  const [composing, setComposing] = useState(false);
  // Droppable on the card list keeps empty columns valid drop targets.
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <section className="column">
      <h2 className="column-name">{column.name}</h2>
      <SortableContext
        items={column.cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="column-cards">
          {column.cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              readOnly={readOnly}
              onTitleChange={(title) => onCardTitleChange(card.id, title)}
              onDescriptionChange={(i, lines) => onCardDescriptionChange(card.id, i, lines)}
              onDescriptionAdd={(lines) => onCardDescriptionAdd(card.id, lines)}
              onArchive={() => onCardArchive(card.id)}
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
    </section>
  );
}

export default ColumnView;
