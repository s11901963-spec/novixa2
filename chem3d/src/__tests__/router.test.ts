// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { keepHashLinksInPage } from '../router';

describe('in-page links', () => {
  let stop: (() => void) | undefined;
  afterEach(() => {
    stop?.();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  // htmlpreview.github.io adds <base href="https://raw.githubusercontent.com/…">; following #links
  // against it would leave the app and show the page source.
  it('only change the hash of this page, even when a <base> points elsewhere', () => {
    document.head.innerHTML = '<base href="https://raw.example.org/repo/docs/index.html">';
    document.body.innerHTML = '<a id="go" href="#challenges">التحديات</a><a id="out" href="https://doi.org/10.1000/x">doi</a>';
    stop = keepHashLinksInPage();
    const click = (id: string, init: MouseEventInit = {}) => {
      const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
      document.getElementById(id)!.dispatchEvent(e);
      return e;
    };
    const e = click('go');
    expect(e.defaultPrevented).toBe(true);
    expect(window.location.hash).toBe('#challenges');
    // other links, and opening in a new tab, are left to the browser
    expect(click('out').defaultPrevented).toBe(false);
    expect(click('go', { ctrlKey: true }).defaultPrevented).toBe(false);
  });

  it('leave links that already handled the click alone', () => {
    document.body.innerHTML = '<a id="skip" href="#main">skip</a>';
    document.getElementById('skip')!.addEventListener('click', (e) => e.preventDefault());
    stop = keepHashLinksInPage();
    window.location.hash = '#lab';
    document.getElementById('skip')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    expect(window.location.hash).toBe('#lab');
  });
});
