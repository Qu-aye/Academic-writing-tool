import Cite from 'citation-js';
import type { AcademicSource, AuthorName, CitationEntry, CitationStyle } from '../types';

const TEMPLATE_BY_STYLE: Record<CitationStyle, string> = {
  apa: 'apa',
  mla: 'modern-language-association',
  vancouver: 'vancouver',
  'harvard-ctr': 'harvard1',
};

function normalizeFamilyName(author?: AuthorName): string {
  if (!author) {
    return 'Unknown';
  }

  if (author.family) {
    return author.family;
  }

  if (author.literal) {
    const parts = author.literal.trim().split(/\s+/);
    return parts[parts.length - 1] ?? 'Unknown';
  }

  return author.given ?? 'Unknown';
}

function buildAuthorListLabel(authors: AuthorName[]): string {
  if (authors.length === 0) {
    return 'Unknown';
  }

  if (authors.length === 1) {
    return normalizeFamilyName(authors[0]);
  }

  if (authors.length === 2) {
    return `${normalizeFamilyName(authors[0])} & ${normalizeFamilyName(authors[1])}`;
  }

  return `${normalizeFamilyName(authors[0])} et al.`;
}

function toCslJson(source: AcademicSource) {
  return {
    id: source.id,
    DOI: source.doi,
    URL: source.url,
    title: source.title,
    author: source.authors.map((author) => ({
      given: author.given,
      family: author.family,
      literal: author.literal,
    })),
    issued: source.year
      ? {
          'date-parts': [[source.year]],
        }
      : undefined,
    'container-title': source.containerTitle,
    type: 'article-journal',
  };
}

export function formatInlineCitation(
  source: AcademicSource,
  style: CitationStyle,
  citationNumber?: number,
): string {
  if (style === 'vancouver') {
    return `[${citationNumber ?? '?'}]`;
  }

  if (style === 'mla') {
    return `[${buildAuthorListLabel(source.authors)}]`;
  }

  const authorLabel = buildAuthorListLabel(source.authors);
  const yearLabel = source.year ? `, ${source.year}` : '';
  return `[${authorLabel}${yearLabel}]`;
}

export function formatBibliography(entries: CitationEntry[], style: CitationStyle): string {
  if (entries.length === 0) {
    return '<p class="bibliography-empty">Add citations to build your bibliography.</p>';
  }

  const cite = new Cite(entries.map((entry) => toCslJson(entry.source)));

  return cite.format('bibliography', {
    format: 'html',
    template: TEMPLATE_BY_STYLE[style],
    lang: 'en-US',
  });
}
