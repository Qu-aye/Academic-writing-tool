import { Node } from '@tiptap/core';

export const CitationToken = Node.create({
  name: 'citationToken',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      citationId: {
        default: null,
      },
      locator: {
        default: null,
      },
      label: {
        default: '[Citation]',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-citation-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        ...HTMLAttributes,
        'data-citation-id': HTMLAttributes.citationId,
        'data-citation-locator': HTMLAttributes.locator,
        class: 'citation-token',
        contenteditable: 'false',
      },
      HTMLAttributes.label,
    ];
  },

  renderText({ node }) {
    return node.attrs.label;
  },
});
