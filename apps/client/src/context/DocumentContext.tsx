import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { AcademicSource, CitationEntry, CitationStyle } from '../types';

type DocumentContextValue = {
  style: CitationStyle;
  setStyle: (style: CitationStyle) => void;
  bibliography: CitationEntry[];
  citationsById: Record<string, CitationEntry>;
  upsertCitation: (source: AcademicSource) => string;
  getCitationNumber: (citationId: string) => number | undefined;
};

const DEFAULT_STYLE: CitationStyle = 'harvard-ctr';
const DocumentContext = createContext<DocumentContextValue | null>(null);

function normalizeSourceKey(source: AcademicSource): string {
  return (
    source.doi?.toLowerCase() ??
    source.pubmedId ??
    source.semanticScholarId ??
    `${source.title.toLowerCase().replace(/\W+/g, '-')}-${source.year ?? 'nd'}`
  );
}

export function DocumentProvider({ children }: PropsWithChildren) {
  const [style, setStyle] = useState<CitationStyle>(DEFAULT_STYLE);
  const [citationsById, setCitationsById] = useState<Record<string, CitationEntry>>({});
  const [citationOrder, setCitationOrder] = useState<string[]>([]);

  const bibliography = useMemo(
    () =>
      citationOrder
        .map((id) => citationsById[id])
        .filter((entry): entry is CitationEntry => Boolean(entry)),
    [citationOrder, citationsById],
  );

  const getCitationNumber = (citationId: string) => {
    const index = citationOrder.indexOf(citationId);
    return index >= 0 ? index + 1 : undefined;
  };

  const upsertCitation = (source: AcademicSource) => {
    const key = normalizeSourceKey(source);
    const existingEntry = citationsById[key];

    if (existingEntry) {
      return existingEntry.id;
    }

    const entry: CitationEntry = {
      id: key,
      source,
      insertedAt: Date.now(),
    };

    setCitationsById((current) => ({
      ...current,
      [key]: entry,
    }));
    setCitationOrder((current) => [...current, key]);

    return key;
  };

  const value = useMemo<DocumentContextValue>(
    () => ({
      style,
      setStyle,
      bibliography,
      citationsById,
      upsertCitation,
      getCitationNumber,
    }),
    [bibliography, citationsById, style],
  );

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}

export function useDocument() {
  const value = useContext(DocumentContext);

  if (!value) {
    throw new Error('useDocument must be used inside DocumentProvider');
  }

  return value;
}
