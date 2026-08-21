import type { TJoinedMessage } from '@kurier/shared';
import { describe, expect, test } from 'bun:test';

const memory = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => memory.clear(),
    key: (index: number) => [...memory.keys()][index] ?? null,
    get length() {
      return memory.size;
    }
  }
});

const { serverSliceActions, serverSliceReducer } = await import('../slice');

const makeMessage = (id: number, channelId: number): TJoinedMessage => ({
  id,
  content: '',
  userId: 1,
  pluginId: null,
  channelId,
  parentMessageId: null,
  replyToMessageId: null,
  editable: true,
  metadata: null,
  createdAt: id,
  updatedAt: null,
  pinned: false,
  pinnedAt: null,
  pinnedBy: null,
  editedAt: null,
  editedBy: null,
  files: [],
  reactions: []
});

describe('message map prune', () => {
  test('drops inactive channel maps and keeps the requested ones', () => {
    let state = serverSliceReducer(undefined, { type: 'unknown' });

    state = serverSliceReducer(
      state,
      serverSliceActions.addMessages({
        channelId: 1,
        messages: [makeMessage(1, 1)]
      })
    );
    state = serverSliceReducer(
      state,
      serverSliceActions.addMessages({
        channelId: 2,
        messages: [makeMessage(2, 2)]
      })
    );
    state = serverSliceReducer(
      state,
      serverSliceActions.addMessages({
        channelId: 3,
        messages: [makeMessage(3, 3)]
      })
    );

    state = serverSliceReducer(
      state,
      serverSliceActions.pruneInactiveChannelMessages({ keepIds: [2, 3] })
    );

    expect(state.messagesMap[1]).toBeUndefined();
    expect(state.messagesMap[2]).toHaveLength(1);
    expect(state.messagesMap[3]).toHaveLength(1);
  });

  test('trims oldest messages when over the keep count', () => {
    let state = serverSliceReducer(undefined, { type: 'unknown' });

    state = serverSliceReducer(
      state,
      serverSliceActions.addMessages({
        channelId: 1,
        messages: [makeMessage(1, 1), makeMessage(2, 1), makeMessage(3, 1)]
      })
    );

    state = serverSliceReducer(
      state,
      serverSliceActions.trimOldestMessages({ channelId: 1, keep: 2 })
    );

    expect(state.messagesMap[1]?.map((message) => message.id)).toEqual([2, 3]);
  });
});
