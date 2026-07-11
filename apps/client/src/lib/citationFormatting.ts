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

function buildHarvardInTextLabel(authors: AuthorName[]): string {
  if (authors.length === 0) {
    return 'Unknown';
  }

  if (authors.length === 1) {
    const singleAuthor = authors[0];
    return singleAuthor.literal?.trim() || normalizeFamilyName(singleAuthor);
  }

  if (authors.length === 2) {
    return `${normalizeFamilyName(authors[0])} and ${normalizeFamilyName(authors[1])}`;
  }

  if (authors.length === 3) {
    return `${normalizeFamilyName(authors[0])}, ${normalizeFamilyName(authors[1])} and ${normalizeFamilyName(authors[2])}`;
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
  locator?: string,
): string {
  if (style === 'vancouver') {
    return locator ? `[${citationNumber ?? '?'}${locator ? `, ${locator}` : ''}]` : `[${citationNumber ?? '?'}]`;
  }

  if (style === 'mla') {
    return locator ? `[${buildAuthorListLabel(source.authors)}${locator ? `, ${locator}` : ''}]` : `[${buildAuthorListLabel(source.authors)}]`;
  }

  if (style === 'harvard-ctr') {
    const authorLabel = buildHarvardInTextLabel(source.authors);
    const yearLabel = source.year ? `, ${source.year}` : '';
    const locatorLabel = locator ? `, ${locator}` : '';
    return `(${authorLabel}${yearLabel}${locatorLabel})`;
  }

  const authorLabel = buildAuthorListLabel(source.authors);
  const yearLabel = source.year ? `, ${source.year}` : '';
  const locatorLabel = locator ? `, ${locator}` : '';
  return `[${authorLabel}${yearLabel}${locatorLabel}]`;
}

function renderSourceMetadata(source: AcademicSource): string {
	const metadata: string[] = [];

	if (source.provider) {
		metadata.push(`<span class="bibliography-meta-item"><strong>Database:</strong> ${escapeHtml(source.provider)}</span>`);
	}

	if (source.abstract) {
		metadata.push(
			`<span class="bibliography-meta-item"><strong>Abstract:</strong> ${escapeHtml(source.abstract)}</span>`,
		);
	}

	if (source.doi) {
		metadata.push(
			`<span class="bibliography-meta-item"><strong>DOI:</strong> <a href="https://doi.org/${escapeHtml(source.doi)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.doi)}</a></span>`,
		);
	}

	if (source.url) {
		metadata.push(
			`<span class="bibliography-meta-item"><strong>URL:</strong> <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.url)}</a></span>`,
		);
	}

	if (source.pubmedId) {
		metadata.push(
			`<span class="bibliography-meta-item"><strong>PubMed ID:</strong> ${escapeHtml(source.pubmedId)}</span>`,
		);
	}

	if (source.semanticScholarId) {
		metadata.push(
			`<span class="bibliography-meta-item"><strong>Semantic Scholar ID:</strong> ${escapeHtml(source.semanticScholarId)}</span>`,
		);
	}

	if (metadata.length === 0) {
		return '';
	}

	return `<div class="bibliography-source-metadata">${metadata.join('')}</div>`;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export function formatBibliography(entries: CitationEntry[], style: CitationStyle): string {
	if (entries.length === 0) {
		return '<p class="bibliography-empty">Add citations to build your bibliography.</p>';
	}

	const cite = new Cite(entries.map((entry) => toCslJson(entry.source)));

	const formatted = cite.format('bibliography', {
		format: 'html',
		template: TEMPLATE_BY_STYLE[style],
		lang: 'en-US',
	});

	const expanded = entries.reduce<string>((html, entry) => {
		const authorBlock = entry.source.authors
			.map((author) => `${author.given ?? ''} ${author.family ?? author.literal ?? ''}`.trim())
			.filter(Boolean)
			.join(', ');

		if (!authorBlock) {
			return html;
		}

		const normalizedAuthorBlock = authorBlock.replace(/\.\s+/g, '. ').replace(/\s+/g, ' ').trim();
		const etAlPattern = new RegExp(`${escapeRegExp(normalizedAuthorBlock)}\\s*,?\\s*et al\\.`, 'gi');
		return html.replace(etAlPattern, normalizedAuthorBlock);
	}, formatted);

	const metadataBlocks = entries
		.map((entry) => renderSourceMetadata(entry.source))
		.filter(Boolean)
		.join('');

	return `${expanded}${metadataBlocks}`;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
