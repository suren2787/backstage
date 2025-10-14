declare module 'uuid' {
  export function v4(): string;
}

declare module 'gradle-to-js/lib/parser' {
  export function parseText(content: string): Promise<any>;
}
