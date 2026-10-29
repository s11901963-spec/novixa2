import katex from 'katex';
import { useMemo } from 'react';

/** Renders TeX with KaTeX. Math is always laid out left-to-right, even inside Arabic text. */
export function Tex({ tex, display = false, className = '' }: { tex: string; display?: boolean; className?: string }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' }),
    [tex, display],
  );
  if (!tex) return null;
  return <span dir="ltr" className={`tex ${display ? 'block' : 'inline-block align-middle'} ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
