## 2024-05-18 - Added ARIA labels and focus styles to icon-only buttons
**Learning:** Found that multiple components (CsvUploader, ResultsGrid) had icon-only buttons missing `aria-label` attributes and keyboard focus indicators, making them inaccessible to screen readers and keyboard users.
**Action:** Always verify icon-only buttons have proper aria-labels and use `focus-visible:ring-2 focus-visible:ring-primary` or similar Tailwind utility classes for consistent and accessible focus states across the app.
