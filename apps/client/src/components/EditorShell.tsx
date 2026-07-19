import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { parseUploadedDocument, saveDocumentState, getDocument, updateDocument, listDocuments } from '../api/documents';
import { useAuth } from '../context/AuthContext';
import { CitationToken } from '../editor/CitationToken';
import { FontStyle, InlineTextStyle, StyledBold, StyledHeading, StyledItalic, StyledParagraph, Underline } from '../editor/formattingExtensions';
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
  const { getIdToken, user } = useAuth();
  const { style, bibliography, citationsById, upsertCitation, getCitationNumber, clearVersion } = useDocument();
  const [selectedText, setSelectedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('docx');
  const [documentName, setDocumentName] = useState('research-draft');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
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
        bold: false,
        italic: false,
      }),
      StyledParagraph,
      StyledHeading,
      StyledBold,
      StyledItalic,
      FontStyle,
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

  const currentEditor = editor!;

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

      const locator = node.attrs.locator as string | undefined;
      const nextLabel = formatInlineCitation(
        entry.source,
        style,
        citationNumbers.get(citationId),
        locator,
      );

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

  useEffect(() => {
    if (!editor) {
      return;
    }

    const positions: number[] = [];
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === 'citationToken') {
        positions.push(position);
      }
    });

    if (positions.length === 0) {
      return;
    }

    const transaction = editor.state.tr;
    for (let i = positions.length - 1; i >= 0; i--) {
      transaction.delete(positions[i], positions[i] + 1);
    }
    editor.view.dispatch(transaction);
  }, [clearVersion, editor]);

  useEffect(() => { if (!editor) { return; } const handleUpdate = () => { setHasUnsavedChanges(true); }; editor.on('update', handleUpdate); return () => { editor.off('update', handleUpdate); }; }, [editor]);
  useEffect(() => { if (!editor || !user) { return; } let cancelled = false; async function loadRecentDocument() { try { const result = await listDocuments({ getIdToken }); const documents = (result as { documents: Array<{ _id: string; title: string; bodyHtml: string; citationStyle: string }> }).documents; if (cancelled) { return; } if (documents.length > 0) { const recent = documents[0]; setDocumentId(recent._id); setDocumentName(recent.title); currentEditor.commands.setContent(recent.bodyHtml); setLastSaved(new Date()); setHasUnsavedChanges(false); } } catch (error) { if (!cancelled) { console.error('Failed to load recent document:', error); } } } loadRecentDocument(); return () => { cancelled = true; }; }, [editor, user, getIdToken]);
  useEffect(() => { if (!editor || !user) { return; } if (autoSaveTimerRef.current) { clearInterval(autoSaveTimerRef.current); } autoSaveTimerRef.current = window.setInterval(() => { if (hasUnsavedChanges && !isSavingRef.current && editor) { performSave(); } }, 30000); return () => { if (autoSaveTimerRef.current) { clearInterval(autoSaveTimerRef.current); autoSaveTimerRef.current = null; } }; }, [hasUnsavedChanges, editor, user]);
  const performSave = async () => { if (!editor || isSavingRef.current) { return; } isSavingRef.current = true; setIsSaving(true); try { const html = editor.getHTML(); const payload = { title: documentName, bodyHtml: html, citationStyle: style, citations: bibliography.map((entry) => entry.source), }; let result; if (documentId) { result = await updateDocument(documentId, payload, { getIdToken }); } else { result = await saveDocumentState(payload, { getIdToken }); const doc = (result as { document: { _id: string } }).document; if (doc._id) { setDocumentId(doc._id); } } setLastSaved(new Date()); setHasUnsavedChanges(false); setStatusMessage('Document saved.'); } catch (error) { setStatusMessage(error instanceof Error ? error.message : 'Save failed.'); } finally { isSavingRef.current = false; setIsSaving(false); } };
  const handleSave = async () => { await performSave(); };
  const insertCitation = (source: AcademicSource) => {
    if (!editor || !selectionRangeRef.current) {
      return;
    }

    const { from, to } = selectionRangeRef.current;
    const beforeSelection = editor.state.doc.textBetween(Math.max(0, from - 1), from, ' ');
    const afterSelection = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 1), ' ');
    const isQuotedSelection =
      /[“"«„‚‹‘]/.test(beforeSelection) && /[”"»‟›’']/.test(afterSelection);
    const looksLikeDirectQuote =
      /[“”"‘’'«»‹›]/.test(selectedText) || isQuotedSelection || editor.state.selection.$from.parent.type.name === 'blockquote';
    let locator: string | undefined;

    if (looksLikeDirectQuote) {
      const providedLocator = window.prompt(
        'Direct quote detected. Enter a page number or paragraph reference, or leave blank to cancel.',
      );

      if (providedLocator === null) {
        return;
      }

      const trimmedLocator = providedLocator.trim();
      if (!trimmedLocator) {
        setStatusMessage('Direct quotes need a page or paragraph reference.');
        return;
      }

      locator = /^\d+$/.test(trimmedLocator) ? `p. ${trimmedLocator}` : trimmedLocator;
    }

    const citationId = upsertCitation(source);
    const targetPosition = selectionRangeRef.current.to;
    const citationLabel = formatInlineCitation(
      source,
      style,
      getCitationNumber(citationId) ?? bibliography.length + 1,
      locator,
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
              locator: locator ?? null,
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

    if (!user) {
      setStatusMessage('Sign in to upload and save drafts.');
      event.target.value = '';
      return;
    }

    setIsUploading(true);
    setStatusMessage(`Importing ${file.name}...`);

    try {
      const parsedDocument = await parseUploadedDocument(file, { getIdToken });
      editor!.commands.setContent(parsedDocument.html);
      setDocumentName(parsedDocument.fileName);
      setDocumentId(null);
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

  const handleClearDraft = () => {
    if (!editor) {
      return;
    }

    if (!window.confirm('Clear the entire draft? This cannot be undone.')) {
      return;
    }

    editor.commands.setContent(
      '<p>Start writing, paste a draft, or upload a text document. Select any sentence or paragraph to find supporting research and insert citations.</p>',
    );
    setDocumentName('research-draft');
    setDocumentId(null);
    setLastSaved(null);
    setHasUnsavedChanges(false);
    setStatusMessage('Draft cleared.');
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
          <button
            type="button"
            className="ghost-button"
            onClick={handleClearDraft}
          >
            Clear draft
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={isSaving || !hasUnsavedChanges}
            onClick={handleSave}
          >
            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Now' : 'Saved'}
          </button>
          {lastSaved && (
            <span className="save-status">
              {hasUnsavedChanges ? '● Unsaved changes' : `✓ Saved ${lastSaved.toLocaleTimeString()}`}
            </span>
          )}
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
