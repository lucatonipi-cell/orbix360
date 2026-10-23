/**
 * Natural sort comparator: splits filenames into alternating text/number
 * chunks and compares number chunks numerically, so "img2.jpg" sorts before
 * "img10.jpg" (unlike plain lexicographic sort, where "10" < "2").
 */
export function naturalCompare(a: string, b: string): number {
  const chunk = (s: string) => s.match(/(\d+|\D+)/g) ?? [];
  const ca = chunk(a);
  const cb = chunk(b);
  const len = Math.max(ca.length, cb.length);
  for (let i = 0; i < len; i++) {
    const x = ca[i] ?? "";
    const y = cb[i] ?? "";
    const nx = /^\d+$/.test(x) ? parseInt(x, 10) : null;
    const ny = /^\d+$/.test(y) ? parseInt(y, 10) : null;
    if (nx !== null && ny !== null) {
      if (nx !== ny) return nx - ny;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

export function sortFilenamesNaturally<T extends { filename: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => naturalCompare(a.filename, b.filename));
}

/**
 * Heuristic: a set of filenames looks like a 360 photo sequence when most of
 * them share a common non-numeric prefix and their numeric parts form a
 * (roughly) contiguous run — e.g. product_01.jpg..product_36.jpg.
 */
export function looksLike360Sequence(filenames: string[]): boolean {
  if (filenames.length < 8) return false;
  const numbers: number[] = [];
  const prefixes = new Set<string>();
  for (const name of filenames) {
    const match = name.match(/^(.*?)(\d+)(?:\.[a-zA-Z0-9]+)?$/);
    if (!match) continue;
    prefixes.add(match[1]);
    numbers.push(parseInt(match[2], 10));
  }
  if (numbers.length < filenames.length * 0.8) return false;
  if (prefixes.size > 2) return false;
  numbers.sort((a, b) => a - b);
  let gaps = 0;
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] - numbers[i - 1] > 1) gaps++;
  }
  return gaps <= Math.max(1, Math.floor(numbers.length * 0.1));
}
