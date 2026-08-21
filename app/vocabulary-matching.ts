export type VocabularySurface = { item: string };

export type VocabularyMatch<T extends VocabularySurface> = {
  start: number;
  end: number;
  entry: T;
};

const LETTER = /[A-Za-z]/;
const INFLECTION_SUFFIXES = new Set(["s", "es", "ed", "d", "ing"]);

function candidateAt<T extends VocabularySurface>(text: string, lowerText: string, entry: T, start: number): VocabularyMatch<T> | null {
  if (start > 0 && LETTER.test(text[start - 1])) return null;

  const rawEnd = start + entry.item.length;
  let end = rawEnd;

  if (rawEnd < text.length && LETTER.test(text[rawEnd])) {
    let wordEnd = rawEnd;
    while (wordEnd < text.length && LETTER.test(text[wordEnd])) wordEnd += 1;
    const suffix = lowerText.slice(rawEnd, wordEnd);
    if (!INFLECTION_SUFFIXES.has(suffix)) return null;
    end = wordEnd;
  }

  return { start, end, entry };
}

export function vocabularyInText<T extends VocabularySurface>(text: string, entries: readonly T[]): VocabularyMatch<T>[] {
  const candidates = entries
    .filter((entry) => entry.item.length >= 3 && !entry.item.includes("..."))
    .sort((a, b) => b.item.length - a.item.length);
  const lowerText = text.toLocaleLowerCase();
  const matches: VocabularyMatch<T>[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let next: VocabularyMatch<T> | null = null;
    for (const entry of candidates) {
      const needle = entry.item.toLocaleLowerCase();
      let searchFrom = cursor;
      while (searchFrom < text.length) {
        const start = lowerText.indexOf(needle, searchFrom);
        if (start === -1) break;
        const candidate = candidateAt(text, lowerText, entry, start);
        if (candidate) {
          if (!next || candidate.start < next.start || (candidate.start === next.start && candidate.end > next.end)) next = candidate;
          break;
        }
        searchFrom = start + Math.max(1, needle.length);
      }
    }
    if (!next) break;
    matches.push(next);
    cursor = next.end;
  }

  return matches;
}
