import { Extension, Mark } from '@tiptap/core';
import BoldExtension from '@tiptap/extension-bold';
import Heading from '@tiptap/extension-heading';
import ItalicExtension from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import UnderlineExtension from '@tiptap/extension-underline';

// 1. Export Underline (preserves style attribute)
export const Underline = UnderlineExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
    };
  },
});

// 2. Export Bold that preserves style attribute
export const StyledBold = BoldExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
    };
  },
});

// 3. Export Italic that preserves style attribute
export const StyledItalic = ItalicExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
    };
  },
});

// 4. Export Styled Heading (preserves style attribute)
export const StyledHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return [
      `h${HTMLAttributes.level ?? 1}`,
      {
        ...HTMLAttributes,
        class: `text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 ${HTMLAttributes.class ?? ''}`.trim(),
      },
      0,
    ];
  },
});

// 5. Export Styled Paragraph (preserves style attribute)
export const StyledParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      {
        ...HTMLAttributes,
        class: `leading-7 text-slate-700 dark:text-slate-300 ${HTMLAttributes.class ?? ''}`.trim(),
      },
      0,
    ];
  },
});

// 6. FontStyle mark — captures arbitrary styled <span> elements from uploads
//    so font-family, font-size, color, and background-color survive the editor round-trip.
export const FontStyle = Mark.create({
  name: 'fontStyle',

  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[style]',
        getAttrs: (element) => {
          const style = (element as HTMLElement).getAttribute('style');
          // Only capture spans that have font-related styles (not arbitrary spans)
          if (!style) {
            return false;
          }
          return { style };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
});

// 7. Export Inline Text Style extension (registers the fontStyle mark globally)
export const InlineTextStyle = Extension.create({
  name: 'inlineTextStyle',
});