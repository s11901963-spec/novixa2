import { Fragment } from 'react';
import { subshellLabel, type Term } from '../../chem/electrons';

/** "[Ne] 3s² 3p³" with real superscripts, isolated left-to-right inside Arabic text. */
export function ConfigText({ terms, core, className = '' }: { terms: Term[]; core?: string | null; className?: string }) {
  return (
    <bdi dir="ltr" className={`font-mono ${className}`}>
      {core && <span>[{core}]</span>}
      {terms.map((t, i) => (
        <Fragment key={subshellLabel(t)}>
          {(i > 0 || core) && ' '}
          <span className="whitespace-nowrap">
            {subshellLabel(t)}
            <sup className="text-[0.7em]">{t.count}</sup>
          </span>
        </Fragment>
      ))}
    </bdi>
  );
}
