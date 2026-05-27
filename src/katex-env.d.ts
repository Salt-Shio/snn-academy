declare module 'katex/dist/contrib/auto-render' {
  import { KaTeXOptions } from 'katex';
  export default function renderMathInElement(elem: HTMLElement, options?: KaTeXOptions & {
    delimiters?: Array<{ left: string, right: string, display: boolean }>;
    ignoredTags?: string[];
    ignoredClasses?: string[];
    errorCallback?: (msg: string, err: Error) => void;
    preProcess?: (math: string) => string;
  }): void;
}
