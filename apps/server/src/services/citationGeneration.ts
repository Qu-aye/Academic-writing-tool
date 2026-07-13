import type { AcademicSource, CitationFilterBucket, CitationResponse, CitationStyle } from '../types.js';

type FormattedAuthor = { given: string; family: string; literal?: string };

function formatAuthor(author: { given?: string; family?: string; literal?: string }): string {
  if (author.literal) {
    return author.literal;
  }
  const given = author.given ?? '';
  const family = author.family ?? '';
  if (!family) {
    return given || 'Unknown';
  }
  if (!given) {
    return family;
  }
  return `${family}, ${given}`;
}

function formatAuthorsHarvardCTR(authors: FormattedAuthor[]): string {
  if (authors.length === 0) return 'Unknown';
  if (authors.length === 1) return formatAuthor(authors[0]);
  if (authors.length === 2) return `${formatAuthor(authors[0])} and ${formatAuthor(authors[1])}`;
  if (authors.length === 3) return `${formatAuthor(authors[0])}, ${formatAuthor(authors[1])}, and ${formatAuthor(authors[2])}`;
  return `${formatAuthor(authors[0])} et al.`;
}

function formatAuthorsAPA(authors: FormattedAuthor[]): string {
  if (authors.length === 0) return 'Unknown';
  if (authors.length === 1) {
    const a = authors[0];
    if (a.literal) return a.literal;
    return `${a.family}, ${a.given?.[0] ?? ''}.`;
  }
  if (authors.length === 2) {
    const a1 = authors[0];
    const a2 = authors[1];
    const first = a1.literal ? a1.literal : `${a1.family}, ${a1.given?.[0] ?? ''}.`;
    const second = a2.literal ? a2.literal : `${a2.family}, ${a2.given?.[0] ?? ''}.`;
    return `${first}, & ${second}`;
  }
  const first = authors[0];
  const firstFormatted = first.literal ? first.literal : `${first.family}, ${first.given?.[0] ?? ''}.`;
  return `${firstFormatted} et al.`;
}

function formatAuthorsMLA(authors: FormattedAuthor[]): string {
  if (authors.length === 0) return 'Unknown';
  if (authors.length === 1) {
    const a = authors[0];
    if (a.literal) return a.literal;
    return `${a.family}, ${a.given}`;
  }
  if (authors.length === 2) {
    const a1 = authors[0];
    const a2 = authors[1];
    const first = a1.literal ? a1.literal : `${a1.family}, ${a1.given}`;
    const second = a2.literal ? a2.literal : `${a2.given} ${a2.family}`;
    return `${first}, and ${second}`;
  }
  const first = authors[0];
  const firstFormatted = first.literal ? first.literal : `${first.family}, ${first.given}`;
  return `${firstFormatted}, et al.`;
}

function formatAuthorsVancouver(authors: FormattedAuthor[]): string {
  if (authors.length === 0) return 'Unknown';
  if (authors.length <= 6) {
    return authors.map((a) => `${a.family ?? a.literal ?? 'Unknown'} ${(a.given ?? '')[0] ?? ''}`).join(', ');
  }
  const firstSix = authors.slice(0, 6).map((a) => `${a.family ?? a.literal ?? 'Unknown'} ${(a.given ?? '')[0] ?? ''}`);
  return `${firstSix.join(', ')}, et al.`;
}

function formatTitleHarvardCTR(title: string): string {
  return title;
}

function formatTitleAPA(title: string): string {
  return title;
}

function formatTitleMLA(title: string): string {
  return title;
}

function formatTitleVancouver(title: string): string {
  return title;
}

function formatContainerHarvardCTR(containerTitle?: string, year?: number): string {
  if (!containerTitle) return '';
  return year ? `${containerTitle}, ${year}` : containerTitle;
}

function formatContainerAPA(containerTitle?: string, year?: number): string {
  if (!containerTitle) return '';
  return year ? `${containerTitle}, ${year}` : containerTitle;
}

function formatContainerMLA(containerTitle?: string, year?: number): string {
  if (!containerTitle) return '';
  return year ? `${containerTitle}, ${year}` : containerTitle;
}

function formatContainerVancouver(containerTitle?: string, year?: number): string {
  if (!containerTitle) return '';
  return year ? `${containerTitle}; ${year}` : containerTitle;
}

function formatDOI(doi?: string): string {
  if (!doi) return '';
  return `https://doi.org/${doi}`;
}

function formatURL(url?: string): string {
  if (!url) return '';
  return url;
}

function buildHarvardCTR(source: AcademicSource): string {
  const authors = source.authors.map((a) => ({ given: a.given ?? '', family: a.family ?? '', literal: a.literal }));
  const authorStr = formatAuthorsHarvardCTR(authors);
  const title = formatTitleHarvardCTR(source.title);
  const container = formatContainerHarvardCTR(source.containerTitle, source.year);
  const link = formatDOI(source.doi) || formatURL(source.url);
  if (container && link) {
    return `${authorStr}. "${title}." <i>${container}</i>. ${link}.`;
  }
  if (container) {
    return `${authorStr}. "${title}." <i>${container}</i>.`;
  }
  if (link) {
    return `${authorStr}. "${title}." ${link}.`;
  }
  return `${authorStr}. "${title}."`;
}

function buildAPA(source: AcademicSource): string {
  const authors = source.authors.map((a) => ({ given: a.given ?? '', family: a.family ?? '', literal: a.literal }));
  const authorStr = formatAuthorsAPA(authors);
  const title = formatTitleAPA(source.title);
  const container = formatContainerAPA(source.containerTitle, source.year);
  const link = formatDOI(source.doi) || formatURL(source.url);
  if (container && link) {
    return `${authorStr} (${source.year ?? 'n.d.'}). ${title}. <i>${container}</i>. ${link}`;
  }
  if (container) {
    return `${authorStr} (${source.year ?? 'n.d.'}). ${title}. <i>${container}</i>.`;
  }
  if (link) {
    return `${authorStr} (${source.year ?? 'n.d.'}). ${title}. ${link}`;
  }
  return `${authorStr} (${source.year ?? 'n.d.'}). ${title}.`;
}

function buildMLA(source: AcademicSource): string {
  const authors = source.authors.map((a) => ({ given: a.given ?? '', family: a.family ?? '', literal: a.literal }));
  const authorStr = formatAuthorsMLA(authors);
  const title = formatTitleMLA(source.title);
  const container = formatContainerMLA(source.containerTitle, source.year);
  const link = formatDOI(source.doi) || formatURL(source.url);
  if (container && link) {
    return `${authorStr}. "${title}." <i>${container}</i>. ${link}.`;
  }
  if (container) {
    return `${authorStr}. "${title}." <i>${container}</i>.`;
  }
  if (link) {
    return `${authorStr}. "${title}." ${link}.`;
  }
  return `${authorStr}. "${title}."`;
}

function buildVancouver(source: AcademicSource): string {
  const authors = source.authors.map((a) => ({ given: a.given ?? '', family: a.family ?? '', literal: a.literal }));
  const authorStr = formatAuthorsVancouver(authors);
  const title = formatTitleVancouver(source.title);
  const container = formatContainerVancouver(source.containerTitle, source.year);
  const link = formatDOI(source.doi) || formatURL(source.url);
  if (container && link) {
    return `${authorStr}. ${title}. ${container} ${link}.`;
  }
  if (container) {
    return `${authorStr}. ${title}. ${container}.`;
  }
  if (link) {
    return `${authorStr}. ${title}. ${link}.`;
  }
  return `${authorStr}. ${title}.`;
}

function formatCitation(source: AcademicSource, style: CitationStyle): string {
  switch (style) {
    case 'harvard-ctr':
      return buildHarvardCTR(source);
    case 'apa':
      return buildAPA(source);
    case 'mla':
      return buildMLA(source);
    case 'vancouver':
      return buildVancouver(source);
    default:
      return buildHarvardCTR(source);
  }
}

function computeFilterBuckets(sources: AcademicSource[]): CitationFilterBucket[] {
  const years = sources.map((s) => s.year).filter((y): y is number => typeof y === 'number');
  if (years.length === 0) {
    return [{ label: 'All years', minYear: 0, maxYear: 9999 }];
  }
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const range = maxYear - minYear;
  if (range <= 5) {
    return [{ label: 'All years', minYear, maxYear }];
  }
  const bucketSize = Math.ceil(range / 3);
  const buckets: CitationFilterBucket[] = [];
  let start = minYear;
  while (start <= maxYear) {
    const end = Math.min(start + bucketSize - 1, maxYear);
    buckets.push({
      label: `${start}–${end}`,
      minYear: start,
      maxYear: end,
    });
    start = end + 1;
  }
  return buckets;
}

export function generateCitation(
  sources: AcademicSource[],
  style: CitationStyle,
  yearFilter?: string,
): CitationResponse {
  const filtered = yearFilter
    ? sources.filter((s) => {
        if (!s.year) return false;
        const match = yearFilter.match(/(\d{4})[–\-](\d{4})/);
        if (!match) return true;
        const [, min, max] = match;
        return s.year >= Number(min) && s.year <= Number(max);
      })
    : sources;

  const bibliographyString = filtered.map((s) => formatCitation(s, style)).join('<br><br>');
  const filterBuckets = computeFilterBuckets(sources);

  return {
    bibliographyString,
    filterBuckets,
    sourceCount: filtered.length,
  };
}
