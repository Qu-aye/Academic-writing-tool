import { Extension } from '@tiptap/core';
import Heading from '@tiptap/extension-heading';
import Paragraph from '@tiptap/extension-paragraph';
import UnderlineExtension from '@tiptap/extension-underline';

// 1. Export Underline
export const Underline = UnderlineExtension;

// 2. Export Styled Heading
export const StyledHeading = Heading.configure({
  HTMLAttributes: {
    class: 'text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50',
  },
});

// 3. Export Styled Paragraph
export const StyledParagraph = Paragraph.configure({
  HTMLAttributes: {
    class: 'leading-7 text-slate-700 dark:text-slate-300',
  },
});

// 4. Export Inline Text Style
export const InlineTextStyle = Extension.create({
  name: 'inlineTextStyle',
});