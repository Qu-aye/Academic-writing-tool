import { useEffect, useState } from 'react';
import { searchAcademicSources, SearchApiError } from '../api/search';
import { useAuth } from '../context/AuthContext';
import type { AcademicSource } from '../types';

type SearchPopoverProps = {
  query: string;
  visible: boolean;
  top: number;
  left: number;
  onInsert: (source: AcademicSource) => void;
};

const MIN_SEARCH_QUERY_LENGTH = 5;

function getSearchErrorMessage(error: unknown, isSignedIn: boolean): string {
  if (error instanceof SearchApiError) {
    if (error.status === 401) {
      return 'Please sign in to search academic sources.';
    }

    if (error.status === 402) {
      return error.details ?? 'Free search quota exceeded. Upgrade to continue academic source lookups.';
    }

    if (error.details) {
      return error.details;
    }
  }

  return isSignedIn ? 'Search is temporarily unavailable.' : 'Sign in to search academic sources.';
}

export function SearchPopover({
  query,
  visible,
  top,
  left,
  onInsert,
}: SearchPopoverProps) {
  const { getIdToken, user } = useAuth();
  const [results, setResults] = useState<AcademicSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!visible || normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
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
        const response = await searchAcademicSources(query, controller.signal, getIdToken);
        setResults(response.results);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(getSearchErrorMessage(error, Boolean(user)));
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
  }, [getIdToken, query, user, visible]);

  if (!visible) {
    return null;
  }

  const normalizedQuery = query.trim();

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
      {!loading && !error && results.length === 0 && normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH && (
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
