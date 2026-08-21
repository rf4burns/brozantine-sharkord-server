const SEARCH_HAS_VALUES = ['link', 'file', 'image', 'video', 'sound'] as const;

type TSearchHasFilter = (typeof SEARCH_HAS_VALUES)[number];

type TSearchOperatorKey =
  | 'from'
  | 'mentions'
  | 'in'
  | 'has'
  | 'before'
  | 'after'
  | 'during'
  | 'pinned';

type TSearchOperatorMeta = {
  key: TSearchOperatorKey;
  valueType: 'user' | 'channel' | 'has' | 'date' | 'boolean';
};

const SEARCH_OPERATORS: TSearchOperatorMeta[] = [
  { key: 'from', valueType: 'user' },
  { key: 'mentions', valueType: 'user' },
  { key: 'in', valueType: 'channel' },
  { key: 'has', valueType: 'has' },
  { key: 'before', valueType: 'date' },
  { key: 'after', valueType: 'date' },
  { key: 'during', valueType: 'date' },
  { key: 'pinned', valueType: 'boolean' }
];

const SEARCH_OPERATOR_KEYS = SEARCH_OPERATORS.map((op) => op.key);

type TParsedSearchQuery = {
  text: string;
  from?: string;
  mentions?: string;
  in?: string;
  has?: TSearchHasFilter;
  before?: number;
  after?: number;
  during?: { start: number; end: number };
  pinned?: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isSearchHasFilter = (value: string): value is TSearchHasFilter =>
  (SEARCH_HAS_VALUES as readonly string[]).includes(value);

const parseDateDayStartUtc = (value: string): number | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date.getTime();
};

const quoteIfNeeded = (value: string): string => {
  if (/[\s"]/.test(value)) {
    return `"${value.replace(/"/g, '')}"`;
  }

  return value;
};

const normalizeChannelName = (value: string): string =>
  value.startsWith('#') ? value.slice(1) : value;

const tokenizeSearchQuery = (query: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i]!;

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (char === ' ' && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }

      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
};

const unwrapQuotedValue = (value: string): string => {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  return value;
};

const applyOperator = (
  parsed: TParsedSearchQuery,
  key: string,
  rawValue: string
): boolean => {
  const value = unwrapQuotedValue(rawValue);

  if (!value) {
    return false;
  }

  switch (key) {
    case 'from':
      parsed.from = value;
      return true;
    case 'mentions':
      parsed.mentions = value;
      return true;
    case 'in':
      parsed.in = normalizeChannelName(value);
      return true;
    case 'has': {
      const lowered = value.toLowerCase();

      if (!isSearchHasFilter(lowered)) {
        return false;
      }

      parsed.has = lowered;
      return true;
    }
    case 'before': {
      const dayStart = parseDateDayStartUtc(value);

      if (dayStart === undefined) {
        return false;
      }

      parsed.before = dayStart;
      return true;
    }
    case 'after': {
      const dayStart = parseDateDayStartUtc(value);

      if (dayStart === undefined) {
        return false;
      }

      // strictly after that calendar day
      parsed.after = dayStart + MS_PER_DAY;
      return true;
    }
    case 'during': {
      const dayStart = parseDateDayStartUtc(value);

      if (dayStart === undefined) {
        return false;
      }

      parsed.during = { start: dayStart, end: dayStart + MS_PER_DAY };
      return true;
    }
    case 'pinned': {
      const lowered = value.toLowerCase();

      if (lowered !== 'true' && lowered !== 'false') {
        return false;
      }

      parsed.pinned = lowered === 'true';
      return true;
    }
    default:
      return false;
  }
};

const parseSearchQuery = (query: string): TParsedSearchQuery => {
  const parsed: TParsedSearchQuery = { text: '' };
  const textParts: string[] = [];

  for (const token of tokenizeSearchQuery(query.trim())) {
    const colonIndex = token.indexOf(':');

    if (colonIndex <= 0) {
      textParts.push(token);
      continue;
    }

    const key = token.slice(0, colonIndex).toLowerCase();
    const rawValue = token.slice(colonIndex + 1);

    if (!SEARCH_OPERATOR_KEYS.includes(key as TSearchOperatorKey)) {
      textParts.push(token);
      continue;
    }

    const applied = applyOperator(parsed, key, rawValue);

    if (!applied) {
      textParts.push(token);
    }
  }

  parsed.text = textParts.join(' ').trim();

  return parsed;
};

const hasSearchFilters = (parsed: TParsedSearchQuery): boolean =>
  parsed.from !== undefined ||
  parsed.mentions !== undefined ||
  parsed.in !== undefined ||
  parsed.has !== undefined ||
  parsed.before !== undefined ||
  parsed.after !== undefined ||
  parsed.during !== undefined ||
  parsed.pinned !== undefined;

const isValidSearchQuery = (
  parsed: TParsedSearchQuery,
  minTextLength = 2
): boolean => {
  if (hasSearchFilters(parsed)) {
    return true;
  }

  return parsed.text.length >= minTextLength;
};

const serializeSearchQuery = (parsed: TParsedSearchQuery): string => {
  const parts: string[] = [];

  if (parsed.from) {
    parts.push(`from:${quoteIfNeeded(parsed.from)}`);
  }

  if (parsed.mentions) {
    parts.push(`mentions:${quoteIfNeeded(parsed.mentions)}`);
  }

  if (parsed.in) {
    parts.push(`in:${quoteIfNeeded(parsed.in)}`);
  }

  if (parsed.has) {
    parts.push(`has:${parsed.has}`);
  }

  if (parsed.before !== undefined) {
    const date = new Date(parsed.before);
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');

    parts.push(`before:${yyyy}-${mm}-${dd}`);
  }

  if (parsed.after !== undefined) {
    // after is stored as start of next day; serialize back to the user-facing date
    const date = new Date(parsed.after - MS_PER_DAY);
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');

    parts.push(`after:${yyyy}-${mm}-${dd}`);
  }

  if (parsed.during) {
    const date = new Date(parsed.during.start);
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');

    parts.push(`during:${yyyy}-${mm}-${dd}`);
  }

  if (parsed.pinned !== undefined) {
    parts.push(`pinned:${parsed.pinned}`);
  }

  if (parsed.text) {
    parts.push(parsed.text);
  }

  return parts.join(' ');
};

type TSearchTokenAtCursor = {
  start: number;
  end: number;
  token: string;
  key?: TSearchOperatorKey;
  valuePrefix: string;
  isOperatorToken: boolean;
};

const getSearchTokenAtCursor = (
  query: string,
  cursor: number
): TSearchTokenAtCursor => {
  const safeCursor = Math.max(0, Math.min(cursor, query.length));
  let start = safeCursor;
  let end = safeCursor;
  let inQuotes = false;

  // find token start
  for (let i = safeCursor - 1; i >= 0; i--) {
    const char = query[i]!;

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ' ' && !inQuotes) {
      start = i + 1;
      break;
    }

    if (i === 0) {
      start = 0;
    }
  }

  inQuotes = false;

  // find token end
  for (let i = safeCursor; i < query.length; i++) {
    const char = query[i]!;

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ' ' && !inQuotes) {
      end = i;
      break;
    }

    end = i + 1;
  }

  const token = query.slice(start, end);
  const colonIndex = token.indexOf(':');

  if (colonIndex > 0) {
    const key = token.slice(0, colonIndex).toLowerCase();

    if (SEARCH_OPERATOR_KEYS.includes(key as TSearchOperatorKey)) {
      return {
        start,
        end,
        token,
        key: key as TSearchOperatorKey,
        valuePrefix: unwrapQuotedValue(token.slice(colonIndex + 1)),
        isOperatorToken: true
      };
    }
  }

  return {
    start,
    end,
    token,
    valuePrefix: token,
    isOperatorToken: false
  };
};

const replaceSearchToken = (
  query: string,
  tokenStart: number,
  tokenEnd: number,
  replacement: string,
  options?: { trailingSpace?: boolean }
): string => {
  const before = query.slice(0, tokenStart);
  const after = query.slice(tokenEnd);
  const addTrailingSpace = options?.trailingSpace ?? true;
  const needsTrailingSpace =
    addTrailingSpace && (after.length === 0 || !after.startsWith(' '));

  return `${before}${replacement}${needsTrailingSpace ? ' ' : ''}${after}`;
};

const formatSearchOperatorToken = (
  key: TSearchOperatorKey,
  value?: string
): string => {
  if (value === undefined || value === '') {
    return `${key}:`;
  }

  return `${key}:${quoteIfNeeded(value)}`;
};

export {
  SEARCH_HAS_VALUES,
  SEARCH_OPERATORS,
  SEARCH_OPERATOR_KEYS,
  formatSearchOperatorToken,
  getSearchTokenAtCursor,
  hasSearchFilters,
  isValidSearchQuery,
  parseSearchQuery,
  replaceSearchToken,
  serializeSearchQuery
};
export type {
  TParsedSearchQuery,
  TSearchHasFilter,
  TSearchOperatorKey,
  TSearchOperatorMeta,
  TSearchTokenAtCursor
};
