import { describe, expect, test } from 'bun:test';
import {
  getSearchTokenAtCursor,
  hasSearchFilters,
  isValidSearchQuery,
  parseSearchQuery,
  replaceSearchToken,
  serializeSearchQuery
} from '../search-query';

describe('search-query', () => {
  describe('parseSearchQuery', () => {
    test('should parse free text only', () => {
      expect(parseSearchQuery('hello world')).toEqual({
        text: 'hello world'
      });
    });

    test('should parse from and mentions operators', () => {
      expect(parseSearchQuery('from:alice mentions:bob hello')).toEqual({
        text: 'hello',
        from: 'alice',
        mentions: 'bob'
      });
    });

    test('should parse quoted names with spaces', () => {
      expect(
        parseSearchQuery('from:"Cool Name" mentions:"Other User"')
      ).toEqual({
        text: '',
        from: 'Cool Name',
        mentions: 'Other User'
      });
    });

    test('should strip leading hash from in channel', () => {
      expect(parseSearchQuery('in:#general')).toEqual({
        text: '',
        in: 'general'
      });
    });

    test('should parse has filters', () => {
      expect(parseSearchQuery('has:image')).toEqual({
        text: '',
        has: 'image'
      });
      expect(parseSearchQuery('has:LINK')).toEqual({
        text: '',
        has: 'link'
      });
    });

    test('should leave invalid has values as text', () => {
      expect(parseSearchQuery('has:embed hello')).toEqual({
        text: 'has:embed hello'
      });
    });

    test('should parse date operators', () => {
      const parsed = parseSearchQuery(
        'before:2024-01-15 after:2024-01-01 during:2024-01-10'
      );

      expect(parsed.before).toBe(Date.UTC(2024, 0, 15));
      expect(parsed.after).toBe(Date.UTC(2024, 0, 2));
      expect(parsed.during).toEqual({
        start: Date.UTC(2024, 0, 10),
        end: Date.UTC(2024, 0, 11)
      });
      expect(parsed.text).toBe('');
    });

    test('should leave invalid dates as text', () => {
      expect(parseSearchQuery('before:not-a-date after:2024-13-40')).toEqual({
        text: 'before:not-a-date after:2024-13-40'
      });
    });

    test('should parse pinned boolean', () => {
      expect(parseSearchQuery('pinned:true')).toEqual({
        text: '',
        pinned: true
      });
      expect(parseSearchQuery('pinned:false')).toEqual({
        text: '',
        pinned: false
      });
    });

    test('should let last duplicate operator win', () => {
      expect(parseSearchQuery('from:alice from:bob')).toEqual({
        text: '',
        from: 'bob'
      });
    });

    test('should keep unknown operators as text', () => {
      expect(parseSearchQuery('foo:bar hello')).toEqual({
        text: 'foo:bar hello'
      });
    });
  });

  describe('hasSearchFilters / isValidSearchQuery', () => {
    test('should detect filters', () => {
      expect(hasSearchFilters(parseSearchQuery('from:alice'))).toBe(true);
      expect(hasSearchFilters(parseSearchQuery('hello'))).toBe(false);
    });

    test('should allow filter-only queries', () => {
      expect(isValidSearchQuery(parseSearchQuery('from:alice'))).toBe(true);
      expect(isValidSearchQuery(parseSearchQuery('a'))).toBe(false);
      expect(isValidSearchQuery(parseSearchQuery('ab'))).toBe(true);
    });
  });

  describe('serializeSearchQuery', () => {
    test('should round-trip operators and text', () => {
      const original =
        'from:"Cool Name" mentions:bob in:general has:file before:2024-01-15 after:2024-01-01 during:2024-01-10 pinned:true hello';
      const parsed = parseSearchQuery(original);

      expect(serializeSearchQuery(parsed)).toBe(
        'from:"Cool Name" mentions:bob in:general has:file before:2024-01-15 after:2024-01-01 during:2024-01-10 pinned:true hello'
      );
    });
  });

  describe('getSearchTokenAtCursor / replaceSearchToken', () => {
    test('should detect operator token at cursor', () => {
      const query = 'from:al hello';
      const token = getSearchTokenAtCursor(query, 7);

      expect(token).toEqual({
        start: 0,
        end: 7,
        token: 'from:al',
        key: 'from',
        valuePrefix: 'al',
        isOperatorToken: true
      });
    });

    test('should replace token and add trailing space', () => {
      expect(replaceSearchToken('from:al', 0, 7, 'from:alice')).toBe(
        'from:alice '
      );
      expect(replaceSearchToken('from:al hello', 0, 7, 'from:alice')).toBe(
        'from:alice hello'
      );
      expect(
        replaceSearchToken('fr', 0, 2, 'from:', { trailingSpace: false })
      ).toBe('from:');
    });
  });
});
