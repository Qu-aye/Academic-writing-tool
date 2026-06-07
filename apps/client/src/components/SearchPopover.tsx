import { useEffect, useState } from 'react';
import { searchAcademicSources } from '../api/search';
import type { AcademicSource } from '../types';

type SearchPopoverProps = {
  query: string;
  visible: boolean;
  top: number;
  left: number;
  onInsert: (source: AcademicSource) => void;
};

export function SearchPopover({
  query,
  visible,
  top,
  left,
  onInsert,
}: SearchPopoverProps) {
  const [results, setResults] = useState<AcademicSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || query.trim().length < 10) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await searchAcademicSources(query, controller.signal);
        setResults(response.results);
      } catch {
        if (!controller.signal.aborted) {
          setError('Search is temporarily unavailable.');
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query, visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="search-popover" style={{ top, left }}>
      <div className="search-popover__header">
        <span>Related academic sources</span>
        <small>Searching public academic sources</small>
      </div>

      {loading && (
        <p className="search-popover__status">
          Searching Semantic Scholar, Crossref, PubMed, and Google Scholar...
        </p>
      )}
      {error && <p className="search-popover__status search-popover__status--error">{error}</p>}
      {!loading && !error && results.length === 0 && query.trim().length >= 10 && (
        <p className="search-popover__status">No related sources found for this selection.</p>
      )}

      <div className="search-results">
        {results.map((result) => (
          <button
            key={`${result.provider}-${result.id}`}
            type="button"
            className="search-result-card"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onInsert(result)}
          >
            <strong>{result.title}</strong>
            <span>
              {(result.authors[0]?.family ??
                result.authors[0]?.literal ??
                result.authors[0]?.given ??
                'Unknown author')}
              {result.year ? ` • ${result.year}` : ''}
              {result.containerTitle ? ` • ${result.containerTitle}` : ''}
            </span>
            <small>{result.provider}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
