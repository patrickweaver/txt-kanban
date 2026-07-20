import type { Board } from "../types";
import { deletedAtOf, formatDateTime, isArchiveColumn, parseCardDate } from "../boardOps";

interface ArchiveViewProps {
  board: Board;
  readOnly: boolean;
  onRestore: (cardId: string) => void;
}

function ArchiveView({ board, readOnly, onRestore }: ArchiveViewProps) {
  // A file may contain both "## Archived" and a legacy "## Deleted"; show all.
  const cards = board.columns
    .filter(isArchiveColumn)
    .flatMap((col) => col.cards)
    .sort((a, b) => deletedAtOf(b) - deletedAtOf(a));

  return (
    <div className="board">
      <section className="column archive-list">
        <h2 className="column-name">Archive</h2>
        {cards.length === 0 ? (
          <p className="board-empty">No archived cards.</p>
        ) : (
          <div className="column-cards">
            {cards.map((card) => {
              const cardDate = card.date !== null ? parseCardDate(card.date) : null;
              return (
              <div key={card.id} className="card archive-card">
                <div className="card-header">
                  <span className="card-title">{card.title}</span>
                  {!readOnly && (
                    <button
                      className="archive-restore"
                      title="Restore to the first column"
                      onClick={() => onRestore(card.id)}
                    >
                      Restore
                    </button>
                  )}
                </div>
                {cardDate !== null && (
                  <div className="card-date">{formatDateTime(new Date(cardDate))}</div>
                )}
                {card.description !== "" && (
                  <p className="card-description">{card.description}</p>
                )}
                {card.tags.length > 0 && (
                  <ul className="card-tags">
                    {card.tags.map((tag, i) => (
                      <li key={i} className="card-tag">
                        {tag}
                      </li>
                    ))}
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
              </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default ArchiveView;
