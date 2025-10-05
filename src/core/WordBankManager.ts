export type WordGroupKey = 'g1' | 'g2' | 'g3';

export interface WordGroups {
  g1: string[]; // easiest
  g2: string[]; // medium
  g3: string[]; // hard
}

export interface WordBank {
  id: string;
  name: string;
  groups: WordGroups;
  createdAt: number;
  updatedAt: number;
}

export interface WordMix {
  g1: number;
  g2: number;
  g3: number;
}

const LS_BANKS_KEY = 'lkr.wordBanks.v1';
const LS_SELECTED_KEY = 'lkr.selectedWordBankId.v1';

function uuid(): string {
  // Simple uuid-ish generator sufficient for localStorage keys
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeWords(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of list) {
    const word = w.trim().toLowerCase();
    if (!word) continue;
    if (!/^[a-z]+$/.test(word)) continue; // letters only
    if (seen.has(word)) continue;
    seen.add(word);
    out.push(word);
  }
  return out;
}

function defaultBank(): WordBank {
  const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));

  const twoLetters = normalizeWords([
    // common digraphs and 2-letter words/combos
    'er', 'tr', 'ie', 'ei', 'th', 'ch', 'sh', 'ph', 'wh', 'qu', 'st', 'pr', 'br', 'cr', 'dr', 'fr', 'gr', 'pl', 'cl',
    'bl', 'fl', 'gl', 'sl', 'sp', 'sk', 'sm', 'sn', 'sw', 'tw', 'we', 'be', 'do', 'go', 'he', 'if', 'in', 'is', 'it',
    'me', 'no', 'on', 'or', 'to', 'up', 'us', 'an', 'as', 'at', 'by', 'ox', 'my', 'of', 'we', 'am', 'so', 'hi', 'ok',
  ]);

  const shortWords = normalizeWords([
    // 3-5 letters: words + roots/letter groups
    'the', 'and', 'for', 'you', 'are', 'make', 'play', 'game', 'type', 'code', 'ring', 'star', 'hand', 'time', 'true',
    'fire', 'wind', 'iron', 'wood', 'stone', 'arrow', 'guard', 'laser', 'pixel', 'combo', 'skill', 'focus', 'valor',
    'resist', 'storm', 'night', 'light', 'tower', 'magic', 'swift', 'brave', 'steel', 'armor', 'forge', 'flame',
    'frost', 'earth', 'river', 'plain', 'mount', 'field', 'realm', 'crown', 'blade', 'quest', 'trail', 'march',
    // roots/combos 3-5
    'tion', 'ment', 'able', 'able', 'ance', 'ence', 'ness', 'pre', 'post', 'over', 'under', 'anti', 'auto', 'bio',
  ]);

  const now = Date.now();
  return {
    id: 'default',
    name: '基础词库',
    groups: { g1: letters, g2: twoLetters, g3: shortWords },
    createdAt: now,
    updatedAt: now,
  };
}

function loadBanks(): WordBank[] {
  try {
    const raw = window.localStorage.getItem(LS_BANKS_KEY);
    if (!raw) return [defaultBank()];
    const parsed = JSON.parse(raw) as WordBank[];
    if (!parsed || parsed.length === 0) return [defaultBank()];
    // Ensure default bank present (non-deletable by convention)
    const hasDefault = parsed.some((b) => b.id === 'default');
    return hasDefault ? parsed : [defaultBank(), ...parsed];
  } catch {
    return [defaultBank()];
  }
}

function saveBanks(banks: WordBank[]): void {
  window.localStorage.setItem(LS_BANKS_KEY, JSON.stringify(banks));
}

function loadSelectedId(banks: WordBank[]): string {
  const saved = window.localStorage.getItem(LS_SELECTED_KEY);
  if (saved && banks.some((b) => b.id === saved)) return saved;
  // fallback to default
  return banks[0].id;
}

function saveSelectedId(id: string): void {
  window.localStorage.setItem(LS_SELECTED_KEY, id);
}

export class WordBankManager {
  private static _banks: WordBank[] = loadBanks();
  private static _selectedId: string = loadSelectedId(WordBankManager._banks);

  static getBanks(): WordBank[] {
    return [...this._banks];
  }

  static getSelectedBank(): WordBank {
    const found = this._banks.find((b) => b.id === this._selectedId);
    return found ?? this._banks[0];
  }

  static selectBank(id: string): void {
    if (!this._banks.some((b) => b.id === id)) return;
    this._selectedId = id;
    saveSelectedId(id);
  }

  static upsertBank(input: { id?: string; name: string; groups: Partial<WordGroups> | string[] }): WordBank {
    const now = Date.now();
    let groups: WordGroups;
    if (Array.isArray(input.groups)) {
      // bulk import list -> split by length into thirds
      const words = normalizeWords(input.groups);
      const sorted = [...words].sort((a, b) => a.length - b.length);
      const n = sorted.length;
      const s1 = Math.floor(n / 3);
      const s2 = Math.floor((2 * n) / 3);
      groups = {
        g1: sorted.slice(0, s1),
        g2: sorted.slice(s1, s2),
        g3: sorted.slice(s2),
      };
    } else {
      groups = {
        g1: normalizeWords(input.groups.g1 ?? []),
        g2: normalizeWords(input.groups.g2 ?? []),
        g3: normalizeWords(input.groups.g3 ?? []),
      };
    }

    let bank: WordBank;
    if (input.id) {
      const idx = this._banks.findIndex((b) => b.id === input.id);
      if (idx !== -1) {
        bank = { ...this._banks[idx], name: input.name, groups, updatedAt: now };
        this._banks[idx] = bank;
      } else {
        bank = { id: input.id, name: input.name, groups, createdAt: now, updatedAt: now };
        this._banks.unshift(bank);
      }
    } else {
      bank = { id: uuid(), name: input.name, groups, createdAt: now, updatedAt: now };
      this._banks.unshift(bank);
    }

    saveBanks(this._banks);
    // auto select latest edited bank
    this.selectBank(bank.id);
    return bank;
  }

  static deleteBank(id: string): void {
    if (id === 'default') return; // keep built-in
    this._banks = this._banks.filter((b) => b.id !== id);
    if (!this._banks.some((b) => b.id === this._selectedId)) {
      this._selectedId = this._banks[0]?.id ?? 'default';
      saveSelectedId(this._selectedId);
    }
    saveBanks(this._banks);
  }

  static parseBulk(text: string): string[] {
    const tokens = (text || '')
      .split(/[^a-zA-Z]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    return normalizeWords(tokens);
  }

  static makeWordBag(total: number, mix: WordMix, bank?: WordBank): string[] {
    const useBank = bank ?? this.getSelectedBank();
    const g1 = [...useBank.groups.g1];
    const g2 = [...useBank.groups.g2];
    const g3 = [...useBank.groups.g3];

    // Ensure pools exist
    if (g1.length + g2.length + g3.length === 0) {
      // fallback to default
      const d = defaultBank();
      g1.push(...d.groups.g1);
      g2.push(...d.groups.g2);
      g3.push(...d.groups.g3);
    }

    const clamp = (n: number) => Math.max(0, Math.min(total, Math.round(n)));
    let c1 = clamp(total * mix.g1);
    let c2 = clamp(total * mix.g2);
    let c3 = clamp(total * mix.g3);
    // adjust rounding to match total
    let diff = total - (c1 + c2 + c3);
    while (diff !== 0) {
      if (diff > 0) {
        // add to the largest remaining group proportionally
        const order: WordGroupKey[] = ['g1', 'g2', 'g3'].sort((a, b) => (mix[b] as number) - (mix[a] as number));
        const key = order[0];
        if (key === 'g1') c1 += 1;
        else if (key === 'g2') c2 += 1;
        else c3 += 1;
        diff -= 1;
      } else {
        // subtract from the largest count
        const entries: [WordGroupKey, number][] = [
          ['g1', c1],
          ['g2', c2],
          ['g3', c3],
        ];
        entries.sort((a, b) => b[1] - a[1]);
        const key = entries[0][0];
        if (key === 'g1' && c1 > 0) c1 -= 1;
        else if (key === 'g2' && c2 > 0) c2 -= 1;
        else if (key === 'g3' && c3 > 0) c3 -= 1;
        diff += 1;
      }
    }

    function takeRandom(pool: string[], count: number): string[] {
      const out: string[] = [];
      const copy = [...pool];
      for (let i = 0; i < count; i += 1) {
        if (copy.length === 0) {
          // refill from original to allow repetition when not enough unique words
          copy.push(...pool);
          if (copy.length === 0) break; // nothing to take
        }
        const idx = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
      }
      return out;
    }

    const bag = [...takeRandom(g1, c1), ...takeRandom(g2, c2), ...takeRandom(g3, c3)];
    // Shuffle final bag
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }
}

