/**
 * Wraps every Markdown/MDX table in a keyboard-focusable scroll region:
 *
 *   <div class="table-scroll" role="region" tabindex="0" aria-label="…">
 *     <table>…</table>
 *   </div>
 *
 * On narrow screens a wide table scrolls inside this box instead of widening
 * the page (WCAG 1.4.10), and keyboard users can scroll it (WCAG 2.1.1).
 * Tables with four or more columns get a minimum width so their cells stay
 * readable; smaller ones simply fit. The label follows the content language,
 * taken from the file path (src/content/<collection>/<locale>/…).
 */
const LABELS = { en: 'Scrollable table', fr: 'Tableau défilant', ar: 'جدول قابل للتمرير' };

function localeOf(file) {
  const match = String(file?.path ?? file?.history?.[0] ?? '').match(/[\\/](en|fr|ar)[\\/]/);
  return match ? match[1] : 'en';
}

function columnCount(table) {
  const firstRow = [];
  (function find(node) {
    if (firstRow.length) return;
    if (node.tagName === 'tr') {
      firstRow.push(...(node.children ?? []).filter((c) => c.tagName === 'th' || c.tagName === 'td'));
      return;
    }
    (node.children ?? []).forEach(find);
  })(table);
  return firstRow.length;
}

export default function rehypeTableScroll() {
  return (tree, file) => {
    const label = LABELS[localeOf(file)];
    (function walk(node) {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === 'element' && child.tagName === 'table') {
          const wide = columnCount(child) >= 4;
          return {
            type: 'element',
            tagName: 'div',
            properties: {
              className: wide ? ['table-scroll', 'table-scroll--wide'] : ['table-scroll'],
              role: 'region',
              tabIndex: 0,
              ariaLabel: label,
            },
            children: [child],
          };
        }
        walk(child);
        return child;
      });
    })(tree);
  };
}
