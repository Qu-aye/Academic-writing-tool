import { Mark } from '@tiptap/core';
import Heading from '@tiptap/extension-heading';
import Paragraph from '@tiptap/extension-paragraph';

type StyleAttributes = Record<string, string | null>;

const inlineStyleProperties = [
  'font-family',
  'font-size',
  'color',
  'background-color',
  'line-height',
];

const blockStyleProperties = [
  'text-align',
  'line-height',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'text-indent',
  'break-before',
  'page-break-before',
];

function readStyles(element: HTMLElement, properties: string[]) {
  return properties.reduce<StyleAttributes>((attributes, property) => {
    const value = element.style.getPropertyValue(property);

    if (value) {
      attributes[property] = value;
    }

    return attributes;
  }, {});
}

function writeStyle(attributes: StyleAttributes) {
  return Object.entries(attributes)
    .filter(([, value]) => Boolean(value))
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
}

function parseStyleAttributes(properties: string[]) {
  return properties.reduce<Record<string, { default: null; parseHTML: (element: HTMLElement) => string | null }>>(
    (attributes, property) => {
      attributes[property] = {
        default: null,
        parseHTML: (element) => element.style.getPropertyValue(property) || null,
      };

      return attributes;
    },
    {},
  );
}

export const InlineTextStyle = Mark.create({
  name: 'inlineTextStyle',

  addAttributes() {
    return parseStyleAttributes(inlineStyleProperties);
  },

  parseHTML() {
    return [
      {
        tag: 'span[style]',
        getAttrs: (node) => {
          const element = node as HTMLElement;
          return Object.keys(readStyles(element, inlineStyleProperties)).length > 0 ? null : false;
        },
      },
      {
        style: 'font-family',
      },
      {
        style: 'font-size',
      },
      {
        style: 'color',
      },
      {
        style: 'background-color',
      },
      {
        style: 'line-height',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { style: writeStyle(HTMLAttributes as StyleAttributes) }, 0];
  },
});

export const Underline = Mark.create({
  name: 'underline',

  parseHTML() {
    return [
      { tag: 'u' },
      {
        style: 'text-decoration',
        getAttrs: (value) => (String(value).includes('underline') ? null : false),
      },
    ];
  },

  renderHTML() {
    return ['u', 0];
  },
});

export const StyledParagraph = Paragraph.extend({
  addAttributes() {
    return parseStyleAttributes(blockStyleProperties);
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', { style: writeStyle(HTMLAttributes as StyleAttributes) }, 0];
  },
});

export const StyledHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...parseStyleAttributes(blockStyleProperties),
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    return [`h${node.attrs.level}`, { style: writeStyle(HTMLAttributes as StyleAttributes) }, 0];
  },
});
