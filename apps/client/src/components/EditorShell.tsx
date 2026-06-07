import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { parseUploadedDocument } from '../api/documents';
import { CitationToken } from '../editor/CitationToken';
import { InlineTextStyle, StyledHeading, StyledParagraph, Underline } from '../editor/FormattingExtensions';
import { useDocument } from '../context/DocumentContext';
import { exportDocument } from '../lib/exportDocument';
import { formatInlineCitation } from '../lib/citationFormatting';
import { formatBibliography } from '../lib/citationFormatting';
import { SearchPopover } from './SearchPopover';
import type { AcademicSource, ExportFormat } from '../types';

type PopoverState = {
  visible: boolean;
  top: number;
  left: number;
};

export function EditorShell() {
  const { style, bibliography, citationsById, upsertCitation, getCitationNumber } = useDocument();
  const [selectedText, setSelectedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('docx');
  const [documentName, setDocumentName] = useState('research-draft');
  const [popoverState, setPopoverState] = useState<PopoverState>({
    visible: false,
    top: 0,
    left: 0,
  });
  const selectionRangeRef = useRef<{ from: number; to: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const citationNumbers = useMemo(
    () => new Map(bibliography.map((entry, index) => [entry.id, index + 1])),
    [bibliography],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        paragraph: false,
      }),
      StyledParagraph,
      StyledHeading,
      InlineTextStyle,
      Underline,
      CitationToken,
    ],
    content:
      '<p>Start writing, paste a draft, or upload a text document. Select any sentence or paragraph to find supporting research and insert citations.</p>',
    editorProps: {
      attributes: {
        class: 'editor-surface',
      },
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { from, to, empty } = currentEditor.state.selection;

      if (empty) {
        selectionRangeRef.current = null;
        setSelectedText('');
        setPopoverState((current) => ({ ...current, visible: false }));
        return;
      }

      selectionRangeRef.current = { from, to };
      setSelectedText(currentEditor.state.doc.textBetween(from, to, ' ').trim());

      const domSelection = window.getSelection();
      const range = domSelection?.rangeCount ? domSelection.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();

      if (rect) {
        setPopoverState({
          visible: true,
          top: rect.bottom + 12,
          left: Math.max(12, Math.min(rect.left, window.innerWidth - 420)),
        });
      }
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const transaction = editor.state.tr;

    editor.state.doc.descendants((node, position) => {
      if (node.type.name !== 'citationToken') {
        return;
      }

      const citationId = node.attrs.citationId as string | undefined;
      if (!citationId) {
        return;
      }

      const entry = citationsById[citationId];
      if (!entry) {
        return;
      }

      const nextLabel = formatInlineCitation(entry.source, style, citationNumbers.get(citationId));

      if (node.attrs.label !== nextLabel) {
        transaction.setNodeMarkup(position, undefined, {
          ...node.attrs,
          label: nextLabel,
        });
      }
    });

    if (transaction.docChanged) {
      editor.view.dispatch(transaction);
    }
  }, [bibliography, citationNumbers, citationsById, editor, style]);

  const insertCitation = (source: AcademicSource) => {
    if (!editor || !selectionRangeRef.current) {
      return;
    }

    const citationId = upsertCitation(source);
    const targetPosition = selectionRangeRef.current.to;
    const citationLabel = formatInlineCitation(
      source,
      style,
      getCitationNumber(citationId) ?? bibliography.length + 1,
    );

    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: targetPosition, to: targetPosition },
        [
          { type: 'text', text: ' ' },
          {
            type: 'citationToken',
            attrs: {
              citationId,
              label: citationLabel,
            },
          },
        ],
      )
      .setTextSelection(targetPosition + 2)
      .run();

    selectionRangeRef.current = null;
    setSelectedText('');
    setPopoverState((current) => ({ ...current, visible: false }));
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) {
      return;
    }

    setIsUploading(true);
    setStatusMessage(`Importing ${file.name}...`);

    try {
      const parsedDocument = await parseUploadedDocument(file);
      editor.commands.setContent(parsedDocument.html);
      setDocumentName(parsedDocument.fileName);
      setStatusMessage(`Imported ${parsedDocument.fileName} (${parsedDocument.fileType.toUpperCase()}).`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unable to import this document right now.',
      );
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleExport = async () => {
    if (!editor) {
      return;
    }

    setIsExporting(true);
    setStatusMessage(`Exporting ${documentName} as ${exportFormat.toUpperCase()}...`);

    try {
      await exportDocument({
        format: exportFormat,
        title: documentName,
        bodyHtml: editor.getHTML(),
        bibliographyHtml: formatBibliography(bibliography, style),
      });
      setStatusMessage(`Exported ${documentName} as ${exportFormat.toUpperCase()}.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unable to export this document right now.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="editor-shell">
      <div className="editor-toolbar">
        <div>
          <h2>Draft</h2>
          <p>Select a sentence to search and cite.</p>
        </div>

        <div className="editor-toolbar__actions">
          <button
            type="button"
            className="ghost-button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? 'Importing...' : 'Upload Draft'}
          </button>
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept=".txt,.text,.md,.markdown,.html,.htm,.pdf,.doc,.docx,.odt,.rtf,.csv,.tsv,.json,.xml,.yaml,.yml"
            onChange={handleFileChange}
          />
          <label className="export-picker">
            <span>Export as</span>
            <select
              value={exportFormat}
              onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
            >
              <option value="doc">Word (.doc)</option>
              <option value="docx">Word (.docx)</option>
              <option value="rtf">Rich Text (.rtf)</option>
              <option value="pdf">PDF</option>
              <option value="html">HTML</option>
              <option value="md">Markdown</option>
              <option value="txt">Plain text</option>
            </select>
          </label>
          <button
            type="button"
            className="ghost-button ghost-button--accent"
            disabled={isExporting}
            onClick={handleExport}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      <p className="upload-status">
        {statusMessage ??
          'Supports TXT, Markdown, HTML, PDF, DOC, DOCX, ODT, RTF, CSV, TSV, JSON, XML, YAML, and YML uploads. Export to DOC, DOCX, RTF, PDF, HTML, Markdown, or plain text with the bibliography on a new page/section.'}
      </p>

      <EditorContent editor={editor} />

      <SearchPopover
        query={selectedText}
        visible={popoverState.visible && selectedText.length > 0}
        top={popoverState.top}
        left={popoverState.left}
        onInsert={insertCitation}
      />
    </section>
  );
}
