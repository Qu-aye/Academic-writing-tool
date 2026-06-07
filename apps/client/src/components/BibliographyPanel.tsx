import { useMemo } from 'react';
import { useDocument } from '../context/DocumentContext';
import { formatBibliography } from '../lib/citationFormatting';

export function BibliographyPanel() {
  const { bibliography, style } = useDocument();

  const bibliographyHtml = useMemo(
    () => formatBibliography(bibliography, style),
    [bibliography, style],
  );

  return (
    <section className="bibliography-panel">
      <div className="bibliography-panel__heading">
        <h2>Bibliography</h2>
        <p>Updates instantly as citations are inserted.</p>
      </div>

      <div
        className="bibliography-render"
        dangerouslySetInnerHTML={{ __html: bibliographyHtml }}
      />
    </section>
  );
}
