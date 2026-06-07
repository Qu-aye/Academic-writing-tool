import type { CitationStyle } from '../types';

type StyleSelectorProps = {
  value: CitationStyle;
  onChange: (value: CitationStyle) => void;
};

const STYLE_OPTIONS: { value: CitationStyle; label: string }[] = [
  { value: 'harvard-ctr', label: 'Harvard (Default)' },
  { value: 'apa', label: 'APA' },
  { value: 'mla', label: 'MLA' },
  { value: 'vancouver', label: 'Vancouver' },
];

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  return (
    <label className="style-selector">
      <span>Reference style</span>
      <select value={value} onChange={(event) => onChange(event.target.value as CitationStyle)}>
        {STYLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
