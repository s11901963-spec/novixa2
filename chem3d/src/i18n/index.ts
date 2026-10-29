import { useCallback } from 'react';
import { useSettings, type Lang } from '../state/settings';
import { ar, type TranslationKey } from './ar';
import { en } from './en';

export type { TranslationKey };
export type Params = Record<string, string | number>;

const dictionaries = { ar, en } as const;

export function translate(lang: Lang, key: TranslationKey, params?: Params): string {
  const template: string = dictionaries[lang][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (params[k] === undefined ? m : String(params[k])));
}

export type TFunction = (key: TranslationKey, params?: Params) => string;

export function useT(): TFunction {
  const lang = useSettings((s) => s.lang);
  return useCallback((key: TranslationKey, params?: Params) => translate(lang, key, params), [lang]);
}

export function useLang(): Lang {
  return useSettings((s) => s.lang);
}

/** Whether a dynamic string is a known translation key. */
export function isKey(k: string): k is TranslationKey {
  return k in ar;
}
