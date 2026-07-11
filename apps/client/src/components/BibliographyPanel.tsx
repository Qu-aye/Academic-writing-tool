import { useMemo } from 'react';
import { useDocument } from '../context/DocumentContext';
import { formatBibliography } from '../lib/citationFormatting';

export function BibliographyPanel() {
  const { bibliography, style, clearCitations } = useDocument();

  const bibliographyHtml = useMemo(
    () => formatBibliography(bibliography, style),
    [bibliography, style],
  );

  const handleClearCitations = () => {
    if (bibliography.length === 0) {
      return;
    }

    if (!window.confirm('Remove all citations from the document? This cannot be undone.')) {
      return;
    }

    clearCitations();
  };

  return (
    <section className="bibliography-panel">
      <div className="bibliography-panel__heading">
        <div>
          <h2>Bibliography</h2>
          <p>Updates instantly as citations are inserted.</p>
        </div>
        <button
          type="button"
          className="ghost-button"
          disabled={bibliography.length === 0}
          onClick={handleClearCitations}
        >
          Clear citations
        </button>
      </div>

      <div
        className="bibliography-render"
        dangerouslySetInnerHTML={{ __html: bibliographyHtml }}
      />
    </section>
  );
}
