import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { Board, Card, Column } from "../types";
import {
  addCard,
  addColumn,
  addTag,
  archiveCard,
  findCard,
  findColumnOfCard,
  formatDeletedAt,
  isArchiveColumn,
  moveCardToColumn,
  moveColumn,
  removeColumn,
  removeTag,
  reorderCard,
  setDescription,
  updateCardTitle,
  updateTag,
} from "../boardOps";
import ColumnView, { ColumnOverlay } from "./ColumnView";
import CardView from "./CardView";
import ColumnModal from "./ColumnModal";

// A dragged column only collides with other columns, compared on the x axis
// alone: columns form a horizontal list, and corner-based collision lets a
// tall column's height swamp the horizontal signal, blocking reorders past it
// (repro: kanban-empty.txt). Cards keep corner collision against everything
// (they can drop between cards or onto a column).
const collisionDetection: CollisionDetection = (args) => {
  if (args.active.data.current?.type === "column") {
    const centerX = args.collisionRect.left + args.collisionRect.width / 2;
    return args.droppableContainers
      .filter((container) => container.data.current?.type === "column")
      .flatMap((container) => {
        const rect = container.rect.current;
        if (!rect) return [];
        return {
          id: container.id,
          data: {
            droppableContainer: container,
            value: Math.abs(centerX - (rect.left + rect.width / 2)),
          },
        };
      })
      .sort((a, b) => a.data.value - b.data.value);
  }
  // Cards target whatever is under the pointer; corner distance is only the
  // fallback for gaps. A tall dragged card's corners can otherwise "collide"
  // with a column far from the pointer (same pathology as the column case).
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCorners(args);
};

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
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [autoEditCardId, setAutoEditCardId] = useState<string | null>(null);
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
    if (active.data.current?.type === "column") {
      setActiveColumn(board.columns.find((c) => c.id === String(active.id)) ?? null);
      return;
    }
    setActiveCard(findCard(board, String(active.id)));
  }

  // Moves the dragged card or column while dragging; state only, no save.
  function handleDragOver({ active, over }: DragOverEvent): void {
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // Columns reorder live so the dropped column is already in its final
    // slot; reordering at drag end makes it flash back to its old position.
    if (active.data.current?.type === "column") {
      apply((current) => moveColumn(current, activeId, overId));
      return;
    }

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
    setActiveColumn(null);
    const before = preDragBoard.current;
    preDragBoard.current = null;
    const activeId = String(active.id);

    // Columns were already reordered during dragOver; just persist the result.
    if (active.data.current?.type === "column") {
      const beforeOrder = before?.columns.map((c) => c.id).join();
      const afterOrder = board.columns.map((c) => c.id).join();
      if (beforeOrder !== afterOrder) save(board);
      return;
    }

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
    setActiveColumn(null);
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
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="board">
        <SortableContext
          items={displayColumns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
        {displayColumns.map((column) => (
          <ColumnView
            key={column.id}
            column={column}
            readOnly={readOnly}
            dragDisabled={filterKey !== null}
            autoEditCardId={autoEditCardId}
            onAutoEditConsumed={() => setAutoEditCardId(null)}
            onCardTitleChange={(cardId, title) =>
              commit((b) => updateCardTitle(b, cardId, title))
            }
            onCardDescriptionChange={(cardId, text) =>
              commit((b) => setDescription(b, cardId, text))
            }
            onCardArchive={(cardId) =>
              commit((b) => archiveCard(b, cardId, formatDeletedAt(new Date())))
            }
            onCardAdd={(title) => {
              const id = crypto.randomUUID();
              commit((b) =>
                addCard(b, column.id, {
                  id,
                  title,
                  description: "",
                  date: new Date().toISOString(),
                  tags: [],
                  unknownProps: [],
                })
              );
              setAutoEditCardId(id);
            }}
            onCardTagAdd={(cardId, tag) => commit((b) => addTag(b, cardId, tag))}
            onCardTagUpdate={(cardId, i, tag) => commit((b) => updateTag(b, cardId, i, tag))}
            onCardTagRemove={(cardId, i) => commit((b) => removeTag(b, cardId, i))}
            onRemove={() => commit((b) => removeColumn(b, column.id))}
          />
        ))}
        </SortableContext>
        {!readOnly && (
          <button className="board-add-column" onClick={() => setColumnModalOpen(true)}>
            + Column
          </button>
        )}
        {readOnly && displayColumns.length === 0 && (
          <p className="board-empty">No columns found in this file.</p>
        )}
      </div>
      <DragOverlay>
        {activeCard && <CardView card={activeCard} readOnly overlay />}
        {activeColumn && <ColumnOverlay column={activeColumn} />}
      </DragOverlay>
      </DndContext>
      {columnModalOpen && (
        <ColumnModal
          onSave={(name) => {
            commit((b) => addColumn(b, name));
            setColumnModalOpen(false);
          }}
          onClose={() => setColumnModalOpen(false)}
        />
      )}
    </>
  );
}

export default BoardView;
