<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-13 | Updated: 2026-02-13 -->

# components

## Purpose
React UI components for the citation validation interface. All are client components with Tailwind styling and Korean text labels.

## Key Files

| File | Description |
|------|-------------|
| `CitationInput.tsx` | Textarea form for pasting citations, CrossRef toggle checkbox, example button, submit button with loading spinner. Splits input by double newlines to count citations. |
| `CitationCard.tsx` | Expandable card showing one citation's result: original text, fixed text with copy button, auto-fixes list, manual fixes list, collapsible error details, score badge (color-coded). |
| `ValidationResults.tsx` | Container for results: summary bar (average score, counts), maps results to CitationCard instances, "Copy All" button for 2+ results. Includes internal `CopyAllButton` component. |

## For AI Agents

### Working In This Directory
- All components use `'use client'` directive
- All components are default-exported
- Props interfaces are defined inline above each component
- No external UI library; pure Tailwind CSS styling
- Clipboard API with `document.execCommand('copy')` fallback

### Testing Requirements
- Verify components render correctly in browser
- Test clipboard copy functionality
- Check responsive behavior at different widths
- Verify Korean text renders properly

### Common Patterns
- `useState` for local UI state (expanded/collapsed, copied feedback)
- Color coding: green (>=80), yellow (>=60), red (<60) for scores
- Severity icons: error, warning, info mapped to emoji characters
- Score displayed as Korean "점" (points) suffix

## Dependencies

### Internal
- `@/lib/types` - `ValidationResult` type used by CitationCard and ValidationResults

### External
- `react` - useState hooks

<!-- MANUAL: -->
