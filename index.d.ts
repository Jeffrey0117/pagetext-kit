export function fill(template: string, vars: Record<string, string | number>): string;
export function parts<T>(template: string, vars: Record<string, T>): Array<string | T>;
export function check(
  root: string,
  options?: { ignore?: string[] },
): { files: number; problems: Array<{ file: string; line: number; text: string; why: string }> };
