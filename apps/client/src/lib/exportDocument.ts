import { saveAs } from 'file-saver';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
} from 'docx';
import { jsPDF } from 'jspdf';
import type { ExportFormat } from '../types';

type ExportPayload = {
  format: ExportFormat;
  title: string;
  bodyHtml: string;
  bibliographyHtml: string;
};

type InlineFormat = {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  font?: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
};

type RichBlock = {
  element: Element;
  text: string;
  tag: string;
  listPrefix?: string;
};

const namedColors: Record<string, string> = {
  black: '000000',
  blue: '0000FF',
  cyan: '00FFFF',
  gray: '808080',
  green: '008000',
  lime: '00FF00',
  magenta: 'FF00FF',
  orange: 'FFA500',
  purple: '800080',
  red: 'FF0000',
  silver: 'C0C0C0',
  white: 'FFFFFF',
  yellow: 'FFFF00',
};

function sanitizeFileStem(value: string) {
  return value
    .replace(/\.[^/.]+$/, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'research-draft';
}

function extensionFor(format: ExportFormat) {
  switch (format) {
    case 'docx':
      return 'docx';
    case 'doc':
      return 'doc';
    case 'rtf':
      return 'rtf';
    case 'html':
      return 'html';
    case 'txt':
      return 'txt';
    case 'md':
      return 'md';
    case 'pdf':
    default:
      return 'pdf';
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  saveAs(blob, fileName);
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseHtmlDocument(html: string) {
  const parser = new DOMParser();
  return parser.parseFromString(`<article>${html}</article>`, 'text/html');
}

function collectRichBlocks(html: string) {
  const document = parseHtmlDocument(html);
  const container = document.querySelector('article');

  if (!container) {
    return [] as RichBlock[];
  }

  const blocks: RichBlock[] = [];

  const appendElement = (element: Element) => {
    const tag = element.tagName.toLowerCase();

    if (tag === 'ul' || tag === 'ol') {
      Array.from(element.children).forEach((child, index) => {
        if (child.tagName.toLowerCase() === 'li') {
          blocks.push({
            element: child,
            text: normalizeText(child.textContent ?? ''),
            tag,
            listPrefix: tag === 'ol' ? `${index + 1}. ` : '- ',
          });
        }
      });
      return;
    }

    const text = normalizeText(element.textContent ?? '');

    if (!text && !element.querySelector('br')) {
      return;
    }

    blocks.push({ element, text, tag });
  };

  Array.from(container.children).forEach(appendElement);
  return blocks;
}

function extractBlocks(html: string) {
  return collectRichBlocks(html).map((block) => {
    if (/^h[1-6]$/.test(block.tag)) {
      return block.text.toUpperCase();
    }

    if (block.tag === 'blockquote') {
      return `> ${block.text}`;
    }

    return `${block.listPrefix ?? ''}${block.text}`;
  });
}

function extractBibliographyEntries(html: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');
  const entries = Array.from(document.querySelectorAll('.csl-entry'))
    .map((entry) => normalizeText(entry.textContent ?? ''))
    .filter(Boolean);

  if (entries.length > 0) {
    return entries;
  }

  return extractBlocks(html);
}

function buildHtmlDocument(title: string, bodyHtml: string, bibliographyHtml: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      body {
        color: #1f1c16;
        max-width: 760px;
        margin: 48px auto;
        line-height: 1.7;
        padding: 0 24px 48px;
      }

      body, button, input, select, textarea {
        font-family: Georgia, "Times New Roman", serif;
      }

      h1, h2 {
        font-weight: 700;
      }

      .bibliography-page {
        break-before: page;
        page-break-before: always;
        margin-top: 48px;
      }

      .csl-entry {
        margin-bottom: 1rem;
      }
    </style>
  </head>
  <body>
    <main>${bodyHtml}</main>
    <section class="bibliography-page">
      <h2>Bibliography</h2>
      ${bibliographyHtml}
    </section>
  </body>
</html>`;
}

function normalizeCssColor(value: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim().toLowerCase();
  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (hex) {
    const color = hex[1];
    return color.length === 3
      ? color.split('').map((character) => `${character}${character}`).join('').toUpperCase()
      : color.toUpperCase();
  }

  const rgb = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);

  if (rgb) {
    return [rgb[1], rgb[2], rgb[3]]
      .map((part) => Number(part).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  return namedColors[trimmed];
}

function cssSizeToHalfPoints(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  if (value.endsWith('px')) {
    return Math.round(parsed * 1.5);
  }

  if (value.endsWith('em') || value.endsWith('rem')) {
    return Math.round(parsed * 24);
  }

  return Math.round(parsed * 2);
}

function cssLengthToTwips(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  if (value.endsWith('px')) {
    return Math.round(parsed * 15);
  }

  if (value.endsWith('in')) {
    return Math.round(parsed * 1440);
  }

  if (value.endsWith('cm')) {
    return Math.round(parsed * 567);
  }

  return Math.round(parsed * 20);
}

function mergeInlineFormat(format: InlineFormat, element: HTMLElement): InlineFormat {
  const tag = element.tagName.toLowerCase();
  const color = normalizeCssColor(element.style.getPropertyValue('color'));
  const backgroundColor = normalizeCssColor(element.style.getPropertyValue('background-color'));
  const fontFamily = element.style.getPropertyValue('font-family').replace(/^["']|["']$/g, '');
  const fontSize = cssSizeToHalfPoints(element.style.getPropertyValue('font-size'));
  const textDecoration = element.style.getPropertyValue('text-decoration');

  return {
    ...format,
    bold: format.bold || tag === 'strong' || tag === 'b',
    italics: format.italics || tag === 'em' || tag === 'i',
    underline: format.underline || tag === 'u' || textDecoration.includes('underline'),
    font: fontFamily || format.font,
    size: fontSize ?? format.size,
    color: color ?? format.color,
    backgroundColor: backgroundColor ?? format.backgroundColor,
  };
}

function collectDocxRuns(node: Node, format: InlineFormat = {}): TextRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';

    if (!text) {
      return [];
    }

    return [
      new TextRun({
        text,
        bold: format.bold,
        italics: format.italics,
        underline: format.underline ? { type: UnderlineType.SINGLE } : undefined,
        font: format.font,
        size: format.size,
        color: format.color,
        shading: format.backgroundColor
          ? { type: 'clear', fill: format.backgroundColor, color: format.backgroundColor }
          : undefined,
      }),
    ];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const element = node as HTMLElement;

  if (element.tagName.toLowerCase() === 'br') {
    return [new TextRun({ text: '', break: 1 })];
  }

  const nextFormat = mergeInlineFormat(format, element);
  return Array.from(element.childNodes).flatMap((child) => collectDocxRuns(child, nextFormat));
}

function richBlockToDocxParagraph(block: RichBlock) {
  const element = block.element as HTMLElement;
  const alignment = element.style.getPropertyValue('text-align');
  const isHeading = /^h[1-6]$/.test(block.tag);
  const children = collectDocxRuns(block.element);

  if (block.listPrefix) {
    children.unshift(new TextRun(block.listPrefix));
  }

  return new Paragraph({
    children: children.length ? children : [new TextRun('')],
    heading: isHeading ? HeadingLevel.HEADING_1 : undefined,
    alignment:
      alignment === 'center'
        ? AlignmentType.CENTER
        : alignment === 'right'
          ? AlignmentType.RIGHT
          : alignment === 'justify'
            ? AlignmentType.JUSTIFIED
            : undefined,
    pageBreakBefore:
      element.style.getPropertyValue('break-before') === 'page' ||
      element.style.getPropertyValue('page-break-before') === 'always',
    indent: {
      left: cssLengthToTwips(element.style.getPropertyValue('margin-left')),
      right: cssLengthToTwips(element.style.getPropertyValue('margin-right')),
      firstLine: cssLengthToTwips(element.style.getPropertyValue('text-indent')),
    },
    spacing: {
      before: cssLengthToTwips(element.style.getPropertyValue('margin-top')),
      after: cssLengthToTwips(element.style.getPropertyValue('margin-bottom')),
    },
  });
}

async function exportAsDocx(title: string, bodyHtml: string, bibliographyHtml: string, fileName: string) {
  const bodyBlocks = collectRichBlocks(bodyHtml);
  const bibliographyBlocks = collectRichBlocks(bibliographyHtml);

  const document = new Document({
    title,
    sections: [
      {
        children: [
          ...bodyBlocks.map((block) => richBlockToDocxParagraph(block)),
          new Paragraph({
            text: 'Bibliography',
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
          }),
          ...bibliographyBlocks.map((block) => richBlockToDocxParagraph(block)),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(blob, fileName);
}

function exportAsDoc(title: string, bodyHtml: string, bibliographyHtml: string, fileName: string) {
  const html = buildHtmlDocument(title, bodyHtml, bibliographyHtml);
  downloadBlob(new Blob([html], { type: 'application/msword;charset=utf-8' }), fileName);
}

function writePdfParagraphs(pdf: jsPDF, blocks: string[], startY = 56) {
  const margin = 56;
  const lineHeight = 20;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  let cursorY = startY;

  for (const block of blocks) {
    const lines = pdf.splitTextToSize(block, usableWidth) as string[];
    const blockHeight = lines.length * lineHeight;

    if (cursorY + blockHeight > pageHeight - margin) {
      pdf.addPage();
      cursorY = margin;
    }

    pdf.text(lines, margin, cursorY);
    cursorY += blockHeight + 12;
  }
}

async function exportAsPdf(title: string, bodyHtml: string, bibliographyHtml: string, fileName: string) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const container = window.document.createElement('div');

  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '760px';
  container.style.padding = '0';
  container.style.background = '#ffffff';
  container.innerHTML = `
    <style>
      .pdf-export-root {
        color: #1f1c16;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 12pt;
        line-height: 1.7;
      }

      .pdf-export-root .bibliography-page {
        break-before: page;
        page-break-before: always;
        margin-top: 48px;
      }

      .pdf-export-root .csl-entry {
        margin-bottom: 1rem;
      }
    </style>
    <main class="pdf-export-root">
      ${bodyHtml}
      <section class="bibliography-page">
        <h2>Bibliography</h2>
        ${bibliographyHtml}
      </section>
    </main>
  `;

  window.document.body.appendChild(container);

  try {
    await pdf.html(container, {
      autoPaging: 'text',
      margin: [48, 48, 48, 48],
      width: 500,
      windowWidth: 760,
      callback: (document) => document.save(fileName),
    });
  } finally {
    container.remove();
  }
}

function exportAsText(title: string, bodyHtml: string, bibliographyHtml: string, fileName: string) {
  const body = extractBlocks(bodyHtml).join('\n\n');
  const bibliography = extractBibliographyEntries(bibliographyHtml).join('\n\n');
  const content = `${body}\n\n\f\nBibliography\n\n${bibliography}`;
  downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), fileName);
}

function exportAsMarkdown(title: string, bodyHtml: string, bibliographyHtml: string, fileName: string) {
  const body = extractBlocks(bodyHtml).join('\n\n');
  const bibliography = extractBibliographyEntries(bibliographyHtml)
    .map((entry) => `- ${entry}`)
    .join('\n');
  const content = `${body}\n\n\f\n## Bibliography\n\n${bibliography}`;
  downloadBlob(new Blob([content], { type: 'text/markdown;charset=utf-8' }), fileName);
}

function escapeRtf(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}');
}

function collectRtf(node: Node, format: InlineFormat = {}): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const controls = [
      format.bold ? '\\b ' : '',
      format.italics ? '\\i ' : '',
      format.underline ? '\\ul ' : '',
    ].join('');

    return `${controls}${escapeRtf(node.textContent ?? '')}\\b0\\i0\\ul0 `;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;

  if (element.tagName.toLowerCase() === 'br') {
    return '\\line ';
  }

  const nextFormat = mergeInlineFormat(format, element);
  return Array.from(element.childNodes).map((child) => collectRtf(child, nextFormat)).join('');
}

function exportAsRtf(title: string, bodyHtml: string, bibliographyHtml: string, fileName: string) {
  const body = collectRichBlocks(bodyHtml)
    .map((block) => `${escapeRtf(block.listPrefix ?? '')}${collectRtf(block.element)}\\par\\par`)
    .join('\n');
  const bibliography = collectRichBlocks(bibliographyHtml)
    .map((block) => `${collectRtf(block.element)}\\par\\par`)
    .join('\n');
  const content = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Times New Roman;}}
\\fs24
${body}
\\page
\\b Bibliography\\b0\\par\\par
${bibliography}
}`;
  downloadBlob(new Blob([content], { type: 'application/rtf;charset=utf-8' }), fileName);
}

function exportAsHtml(title: string, bodyHtml: string, bibliographyHtml: string, fileName: string) {
  const html = buildHtmlDocument(title, bodyHtml, bibliographyHtml);
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), fileName);
}

export async function exportDocument(payload: ExportPayload) {
  const stem = sanitizeFileStem(payload.title);
  const fileName = `${stem}.${extensionFor(payload.format)}`;

  switch (payload.format) {
    case 'docx':
      await exportAsDocx(payload.title, payload.bodyHtml, payload.bibliographyHtml, fileName);
      return;
    case 'doc':
      exportAsDoc(payload.title, payload.bodyHtml, payload.bibliographyHtml, fileName);
      return;
    case 'rtf':
      exportAsRtf(payload.title, payload.bodyHtml, payload.bibliographyHtml, fileName);
      return;
    case 'html':
      exportAsHtml(payload.title, payload.bodyHtml, payload.bibliographyHtml, fileName);
      return;
    case 'txt':
      exportAsText(payload.title, payload.bodyHtml, payload.bibliographyHtml, fileName);
      return;
    case 'md':
      exportAsMarkdown(payload.title, payload.bodyHtml, payload.bibliographyHtml, fileName);
      return;
    case 'pdf':
    default:
      await exportAsPdf(payload.title, payload.bodyHtml, payload.bibliographyHtml, fileName);
  }
}
