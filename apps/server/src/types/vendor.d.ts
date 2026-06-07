declare module 'pdf-parse' {
  type PdfParseResult = {
    text: string;
    numpages: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
  };

  export default function pdfParse(dataBuffer: Buffer): Promise<PdfParseResult>;
}

declare module 'word-extractor' {
  type ExtractedDocument = {
    getBody(): string;
  };

  export default class WordExtractor {
    extract(filePath: string): Promise<ExtractedDocument>;
  }
}
