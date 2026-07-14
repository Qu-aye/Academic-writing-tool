import { useEffect, useRef, useState } from "react";
import { searchAcademicSources, SearchApiError, generateCitation, CitationApiError, } from "../api/search";
import { useAuth } from "../context/AuthContext";
import { useDocument } from "../context/DocumentContext";
import type { AcademicSource, CitationResponse } from "../types";

type SearchPopoverProps = {
  query: string;
  visible: boolean;
  top: number;
  left: number;
  onInsert: (source: AcademicSource) => void;
};

const MIN_SEARCH_QUERY_LENGTH = 5;
const currentYear = 2026;

type SortOrder = "recent-past" | "past-recent";
type YearFilter = "" | "5" | "10" | "all";

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "recent-past", label: "Sort: Recent to Past (Newest First)" },
  { value: "past-recent", label: "Sort: Past to Recent (Oldest First)" },
];

const yearFilterOptions: { value: YearFilter; label: string }[] = [
  { value: "", label: "Filter: All Years" },
  { value: "5", label: "Filter: Last 5 Years" },
  { value: "10", label: "Filter: Last 10 Years" },
];

function getSearchErrorMessage(error: unknown, isSignedIn: boolean): string {
  if (error instanceof SearchApiError) {
    if (error.status === 401) {
      return "Please sign in to search academic sources.";
    }
    if (error.status === 402) {
      return error.details ?? "Free search quota exceeded. Upgrade to continue academic source lookups.";
    }
    if (error.details) {
      return error.details;
    }
  }
  return isSignedIn ? "Search is temporarily unavailable." : "Sign in to search academic sources.";
}

function getCitationErrorMessage(error: unknown): string {
  if (error instanceof CitationApiError) {
    if (error.details) {
      return error.details;
    }
    return `Citation generation failed (${error.status}).`;
  }
  return "Unable to generate citation right now.";
}

function applySortAndFilter(
  sources: AcademicSource[],
  sortOrder: SortOrder,
  yearFilter: YearFilter,
): AcademicSource[] {
  let filtered = [...sources];
  if (yearFilter === "5") {
    filtered = filtered.filter((s) => s.year != null && s.year >= currentYear - 5);
  } else if (yearFilter === "10") {
    filtered = filtered.filter((s) => s.year != null && s.year >= currentYear - 10);
  }
  filtered.sort((a, b) => {
    const yearA = a.year ?? 0;
    const yearB = b.year ?? 0;
    return sortOrder === "recent-past" ? yearB - yearA : yearA - yearB;
  });
  return filtered;
}

export function SearchPopover({ query, visible, top, left, onInsert }: SearchPopoverProps) {
  const { getIdToken, user } = useAuth();
  const { style } = useDocument();
  const [results, setResults] = useState<AcademicSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citation, setCitation] = useState<CitationResponse | null>(null);
  const [yearFilter, setYearFilter] = useState<string>("");
  const [citationLoading, setCitationLoading] = useState(false);
  const [citationError, setCitationError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent-past");
  const [activeYearFilter, setActiveYearFilter] = useState<YearFilter>("");
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const displayedResults = applySortAndFilter(results, sortOrder, activeYearFilter);

  useEffect(() => {
    if (!visible) {
      setDragOffset(null);
      setDragging(false);
      dragStartRef.current = null;
    }
  }, [visible]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!visible || normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      setLoading(false);
      setCitation(null);
      setYearFilter("");
      setCitationError(null);
      return;
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await searchAcademicSources(
          query,
          controller.signal,
          getIdToken,
        );
        setResults(response.results);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(getSearchErrorMessage(err, Boolean(user)));
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

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!visible || normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
      setCitation(null);
      setYearFilter("");
      setCitationError(null);
      return;
    }
    const controller = new AbortController();
    let isCancelled = false;
    async function fetchCitation() {
      setCitationLoading(true);
      setCitationError(null);
      try {
        const response = await generateCitation(
          normalizedQuery,
          style,
          yearFilter,
          controller.signal,
          getIdToken,
        );
        if (!isCancelled) {
          setCitation(response);
        }
      } catch (err) {
        if (!isCancelled) {
          setCitationError(getCitationErrorMessage(err));
          setCitation(null);
        }
      } finally {
        if (!isCancelled) {
          setCitationLoading(false);
        }
      }
    }
    const timeoutId = window.setTimeout(fetchCitation, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
      isCancelled = true;
    };
  }, [getIdToken, query, style, yearFilter, visible]);

  useEffect(() => {
    if (!dragging) {
      return;
    }
    function handlePointerMove(event: PointerEvent) {
      if (!dragStartRef.current) return;
      const dx = event.clientX - dragStartRef.current.x;
      const dy = event.clientY - dragStartRef.current.y;
      setDragOffset({ x: dx, y: dy });
    }
    function handlePointerUp() {
      setDragging(false);
      dragStartRef.current = null;
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging]);

  function handleDragStart(event: React.PointerEvent<HTMLDivElement>) {
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  if (!visible) {
    return null;
  }
  const normalizedQuery = query.trim();
  const popoverTop = dragOffset ? top + dragOffset.y : top;
  const popoverLeft = dragOffset ? left + dragOffset.x : left;
  const clampedTop = Math.max(0, Math.min(popoverTop, window.innerHeight - 120));
  const clampedLeft = Math.max(0, Math.min(popoverLeft, window.innerWidth - 420));

  return (
    <div
      className="search-popover max-h-[80vh] overflow-y-auto flex flex-col"
      style={{ top: clampedTop, left: clampedLeft }}
    >
      <div
        className="search-popover__header"
        onPointerDown={handleDragStart}
        style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none", userSelect: "none" }}
      >
        <span>Related academic sources</span>
        <span className="search-popover__drag-handle" aria-hidden="true">⋮⋮</span>
        <div className="search-popover__controls">
          <select
            className="search-popover__control-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            className="search-popover__control-select"
            value={activeYearFilter}
            onChange={(e) => setActiveYearFilter(e.target.value as YearFilter)}
          >
            {yearFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      {loading && (
        <p className="search-popover__status">
          Searching Semantic Scholar, Crossref, PubMed, and Google Scholar...
        </p>
      )}
      {error && (
        <p className="search-popover__status search-popover__status--error">
          {error}
        </p>
      )}
      {!loading && !error && results.length === 0 && normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH && (
        <p className="search-popover__status">
          No related sources found for this selection.
        </p>
      )}
      <div className="search-results">
        {displayedResults.map((result) => (
          <button
            key={`${result.provider}-${result.id}`}
            type="button"
            className="search-result-card"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onInsert(result)}
          >
            <strong>{result.title}</strong>
            <span>
              {result.authors[0]?.family ?? result.authors[0]?.literal ?? result.authors[0]?.given ?? "Unknown author"}
              {result.year ? ` • ${result.year}` : ""}
              {result.containerTitle ? ` • ${result.containerTitle}` : ""}
            </span>
            <small>{result.provider}</small>
          </button>
        ))}
      </div>
      {normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH && (
        <div className="search-popover__citation">
          <div className="search-popover__citation-header">
            <span>Generated Bibliography</span>
            {citation && citation.filterBuckets?.length > 0 && (
              <select
                className="search-popover__year-filter"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                {citation.filterBuckets?.map((bucket) => (
                  <option key={bucket.label} value={bucket.label}>
                    {bucket.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          {citationLoading && (
            <p className="search-popover__status">Generating bibliography...</p>
          )}
          {citationError && (
            <p className="search-popover__status search-popover__status--error">
              {citationError}
            </p>
          )}
          {!citationLoading && !citationError && citation && citation.bibliographyString && (
            <div
              className="search-popover__bibliography"
              dangerouslySetInnerHTML={{ __html: citation.bibliographyString }}
            />
          )}
        </div>
      )}
    </div>
  );
}
