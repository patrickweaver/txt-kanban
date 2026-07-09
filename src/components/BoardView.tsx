import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Board, Card } from "../types";
import {
  addCard,
  addDescriptionLines,
  addTag,
  archiveCard,
  findCard,
  findColumnOfCard,
  formatDeletedAt,
  isArchiveColumn,
  moveCardToColumn,
  removeTag,
  reorderCard,
  updateCardTitle,
  updateDescriptionLine,
  updateTag,
} from "../boardOps";
import ColumnView from "./ColumnView";
import CardView from "./CardView";

interface BoardViewProps {
  board: Board;
  readOnly: boolean;
  /** Applies a mutation to live state and returns the next board. */
  apply(fn: (board: Board) => Board): Board;
  restore(board: Board): void;
  /** Serializes and writes the given board to the file. */
  save(board: Board): void;
}

function BoardView({ board, readOnly, apply, restore, save }: BoardViewProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const preDragBoard = useRef<Board | null>(null);

  const sensors = useSensors(
    // The 8px activation distance lets plain clicks reach the
    // click-to-edit and delete handlers without starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function commit(fn: (board: Board) => Board): void {
    save(apply(fn));
  }

  function handleDragStart({ active }: DragStartEvent): void {
    preDragBoard.current = board;
    setActiveCard(findCard(board, String(active.id)));
  }

  // Moves the card between columns while dragging; state only, no save.
  function handleDragOver({ active, over }: DragOverEvent): void {
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    apply((current) => {
      const fromColumn = findColumnOfCard(current, activeId);
      const overColumn =
        current.columns.find((col) => col.id === overId) ??
        findColumnOfCard(current, overId);
      if (!fromColumn || !overColumn || fromColumn.id === overColumn.id) {
        return current;
      }
      const overIndex = overColumn.cards.findIndex((c) => c.id === overId);
      let index = overColumn.cards.length;
      if (overIndex >= 0) {
        const isBelow =
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height / 2;
        index = overIndex + (isBelow ? 1 : 0);
      }
      return moveCardToColumn(current, activeId, overColumn.id, index);
    });
  }

  function handleDragEnd({ active, over }: DragEndEvent): void {
    setActiveCard(null);
    preDragBoard.current = null;
    const activeId = String(active.id);

    const next = apply((current) => {
      if (!over) return current;
      const column = findColumnOfCard(current, activeId);
      const overIndex = column?.cards.findIndex((c) => c.id === String(over.id)) ?? -1;
      if (!column || overIndex < 0) return current;
      return reorderCard(current, activeId, overIndex);
    });
    save(next);
  }

  function handleDragCancel(): void {
    setActiveCard(null);
    if (preDragBoard.current) restore(preDragBoard.current);
    preDragBoard.current = null;
  }

  const visibleColumns = board.columns.filter((column) => !isArchiveColumn(column));

  // Every tag on a visible card, deduped case-insensitively with first-seen
  // casing kept for display.
  const allTags: string[] = [];
  const seenTags = new Set<string>();
  for (const column of visibleColumns) {
    for (const card of column.cards) {
      for (const tag of card.tags) {
        const key = tag.toLowerCase();
        if (!seenTags.has(key)) {
          seenTags.add(key);
          allTags.push(tag);
        }
      }
    }
  }

  // Ignore a filter whose tag no longer exists (e.g. it was just removed).
  const filterKey =
    activeTag && seenTags.has(activeTag.toLowerCase()) ? activeTag.toLowerCase() : null;

  const displayColumns = filterKey
    ? visibleColumns.map((column) => ({
        ...column,
        cards: column.cards.filter((card) =>
          card.tags.some((tag) => tag.toLowerCase() === filterKey)
        ),
      }))
    : visibleColumns;

  return (
    <>
      {allTags.length > 0 && (
        <div className="filter-bar">
          <span className="filter-label">Filter</span>
          {allTags.map((tag) => (
            <button
              key={tag.toLowerCase()}
              type="button"
              className={`filter-tag${filterKey === tag.toLowerCase() ? " filter-tag-active" : ""}`}
              onClick={() =>
                setActiveTag((current) =>
                  current && current.toLowerCase() === tag.toLowerCase() ? null : tag
                )
              }
            >
              {tag}
            </button>
          ))}
          {filterKey && (
            <button type="button" className="filter-clear" onClick={() => setActiveTag(null)}>
              Clear
            </button>
          )}
        </div>
      )}
      <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="board">
        {displayColumns.map((column) => (
          <ColumnView
            key={column.id}
            column={column}
            readOnly={readOnly}
            dragDisabled={filterKey !== null}
            onCardTitleChange={(cardId, title) =>
              commit((b) => updateCardTitle(b, cardId, title))
            }
            onCardDescriptionChange={(cardId, i, lines) =>
              commit((b) => updateDescriptionLine(b, cardId, i, lines))
            }
            onCardDescriptionAdd={(cardId, lines) =>
              commit((b) => addDescriptionLines(b, cardId, lines))
            }
            onCardArchive={(cardId) =>
              commit((b) => archiveCard(b, cardId, formatDeletedAt(new Date())))
            }
            onCardAdd={(title) =>
              commit((b) =>
                addCard(b, column.id, {
                  id: crypto.randomUUID(),
                  title,
                  description: [],
                  tags: [],
                  unknownProps: [],
                })
              )
            }
            onCardTagAdd={(cardId, tag) => commit((b) => addTag(b, cardId, tag))}
            onCardTagUpdate={(cardId, i, tag) => commit((b) => updateTag(b, cardId, i, tag))}
            onCardTagRemove={(cardId, i) => commit((b) => removeTag(b, cardId, i))}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard && <CardView card={activeCard} readOnly overlay />}
      </DragOverlay>
      </DndContext>
    </>
  );
}

export default BoardView;
