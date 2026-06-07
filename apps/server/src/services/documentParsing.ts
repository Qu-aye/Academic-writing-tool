import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import WordExtractor from 'word-extractor';

type UploadedDocument = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function readXmlAttribute(xml: string, tagName: string, attributeName = 'w:val') {
  const tagMatch = xml.match(new RegExp(`<${tagName}\\b[^>]*>`, 'i'));

  if (!tagMatch) {
    return null;
  }

  const attributeMatch = tagMatch[0].match(new RegExp(`${attributeName}="([^"]+)"`, 'i'));
  return attributeMatch?.[1] ?? null;
}

function hasXmlTag(xml: string, tagName: string) {
  return new RegExp(`<${tagName}\\b`, 'i').test(xml);
}

function wordHalfPointsToCss(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed / 2}pt` : null;
}

function wordTwipsToCss(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed / 20}pt` : null;
}

function styleAttribute(styles: Record<string, string | null | undefined>) {
  const serialized = Object.entries(styles)
    .filter(([, value]) => Boolean(value))
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');

  return serialized ? ` style="${escapeHtml(serialized)}"` : '';
}

function parseDocxRun(runXml: string) {
  const properties = runXml.match(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/i)?.[0] ?? '';
  const font = readXmlAttribute(properties, 'w:rFonts', 'w:ascii') ?? readXmlAttribute(properties, 'w:rFonts', 'w:hAnsi');
  const size = wordHalfPointsToCss(readXmlAttribute(properties, 'w:sz'));
  const color = readXmlAttribute(properties, 'w:color');
  const highlight = readXmlAttribute(properties, 'w:highlight');
  const styles = {
    'font-family': font ? `"${decodeXml(font)}"` : null,
    'font-size': size,
    color: color && color !== 'auto' ? `#${color}` : null,
    'background-color': highlight && highlight !== 'none' ? highlight : null,
  };

  let text = '';
  const tokenPattern = /<w:(t|tab|br)\b([^>]*)>([\s\S]*?)<\/w:\1>|<w:(tab|br)\b([^>]*)\/>/gi;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(runXml))) {
    const tag = match[1] ?? match[4];
    const attributes = match[2] ?? match[5] ?? '';

    if (tag === 't') {
      text += escapeHtml(decodeXml(match[3] ?? ''));
    } else if (tag === 'tab') {
      text += '\t';
    } else if (tag === 'br') {
      text += attributes.includes('w:type="page"') ? '<span style="break-before: page"></span>' : '<br />';
    }
  }

  if (!text) {
    return '';
  }

  if (hasXmlTag(properties, 'w:b')) {
    text = `<strong>${text}</strong>`;
  }

  if (hasXmlTag(properties, 'w:i')) {
    text = `<em>${text}</em>`;
  }

  if (hasXmlTag(properties, 'w:u')) {
    text = `<u>${text}</u>`;
  }

  const style = styleAttribute(styles);
  return style ? `<span${style}>${text}</span>` : text;
}

function parseDocxParagraph(paragraphXml: string) {
  const properties = paragraphXml.match(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/i)?.[0] ?? '';
  const alignment = readXmlAttribute(properties, 'w:jc');
  const spacingTag = properties.match(/<w:spacing\b[^>]*>/i)?.[0] ?? '';
  const indentTag = properties.match(/<w:ind\b[^>]*>/i)?.[0] ?? '';
  const before = spacingTag.match(/w:before="([^"]+)"/i)?.[1] ?? null;
  const after = spacingTag.match(/w:after="([^"]+)"/i)?.[1] ?? null;
  const line = spacingTag.match(/w:line="([^"]+)"/i)?.[1] ?? null;
  const left = indentTag.match(/w:left="([^"]+)"/i)?.[1] ?? null;
  const right = indentTag.match(/w:right="([^"]+)"/i)?.[1] ?? null;
  const firstLine = indentTag.match(/w:firstLine="([^"]+)"/i)?.[1] ?? null;
  const pageBreakBefore = hasXmlTag(properties, 'w:pageBreakBefore');
  const style = styleAttribute({
    'text-align': alignment === 'both' ? 'justify' : alignment,
    'margin-top': wordTwipsToCss(before),
    'margin-bottom': wordTwipsToCss(after),
    'line-height': line ? String(Number(line) / 240) : null,
    'margin-left': wordTwipsToCss(left),
    'margin-right': wordTwipsToCss(right),
    'text-indent': wordTwipsToCss(firstLine),
    'break-before': pageBreakBefore ? 'page' : null,
  });
  const runs = Array.from(paragraphXml.matchAll(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/gi))
    .map((run) => parseDocxRun(run[0]))
    .join('');

  return runs.trim() ? `<p${style}>${runs}</p>` : '<p></p>';
}

function textToHtml(value: string) {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .trim();

  if (!normalized) {
    return '<p></p>';
  }

  return normalized
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function normalizeHtml(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '<p></p>';
  }

  return trimmed
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}

function extensionOf(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

function stripRtf(rtf: string) {
  return rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\tab/g, '\t')
    .replace(/\\'[0-9a-fA-F]{2}/g, (match) =>
      String.fromCharCode(parseInt(match.slice(2), 16)),
    )
    .replace(/\\[a-z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function parseDoc(buffer: Buffer, originalname: string) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'citation-import-'));
  const tempPath = path.join(tempDir, originalname);
  const extractor = new WordExtractor();

  try {
    await writeFile(tempPath, buffer);
    const document = await extractor.extract(tempPath);
    return textToHtml(document.getBody());
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function parseDocx(buffer: Buffer) {
  const archive = await JSZip.loadAsync(buffer);
  const documentXml = await archive.file('word/document.xml')?.async('text');

  if (documentXml) {
    const paragraphs = Array.from(documentXml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi))
      .map((paragraph) => parseDocxParagraph(paragraph[0]))
      .join('');

    if (paragraphs.trim()) {
      return normalizeHtml(paragraphs);
    }
  }

  const result = await mammoth.convertToHtml({ buffer });
  return normalizeHtml(result.value);
}

async function parsePdf(buffer: Buffer) {
  const result = await pdfParse(buffer);
  return textToHtml(result.text);
}

async function parseOdt(buffer: Buffer) {
  const archive = await JSZip.loadAsync(buffer);
  const contentXml = await archive.file('content.xml')?.async('text');

  if (!contentXml) {
    throw new Error('The ODT file is missing content.xml.');
  }

  const extracted = contentXml
    .replace(/<\/text:h>/g, '\n\n')
    .replace(/<\/text:p>/g, '\n\n')
    .replace(/<text:tab\/>/g, '\t')
    .replace(/<text:line-break\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return textToHtml(extracted);
}

export async function parseUploadedDocument(file: UploadedDocument) {
  const extension = extensionOf(file.originalname);

  switch (extension) {
    case '.html':
    case '.htm':
      return {
        html: normalizeHtml(file.buffer.toString('utf8')),
        format: extension.slice(1),
      };
    case '.txt':
    case '.text':
    case '.md':
    case '.markdown':
    case '.csv':
    case '.tsv':
    case '.json':
    case '.xml':
    case '.yaml':
    case '.yml':
      return {
        html: textToHtml(file.buffer.toString('utf8')),
        format: extension.slice(1),
      };
    case '.rtf':
      return {
        html: textToHtml(stripRtf(file.buffer.toString('utf8'))),
        format: 'rtf',
      };
    case '.docx':
      return {
        html: await parseDocx(file.buffer),
        format: 'docx',
      };
    case '.doc':
      return {
        html: await parseDoc(file.buffer, file.originalname),
        format: 'doc',
      };
    case '.odt':
      return {
        html: await parseOdt(file.buffer),
        format: 'odt',
      };
    case '.pdf':
      return {
        html: await parsePdf(file.buffer),
        format: 'pdf',
      };
    default:
      throw new Error(
        'Unsupported file type. Upload txt, md, html, pdf, doc, docx, odt, rtf, csv, tsv, json, xml, yaml, or yml files.',
      );
  }
}
