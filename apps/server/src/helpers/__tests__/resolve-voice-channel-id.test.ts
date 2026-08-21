import { ServerEvents, StreamKind } from '@kurier/shared';
import { describe, expect, test } from 'bun:test';
import { initTest } from '../../__tests__/helpers';
import { VoiceRuntime } from '../../runtimes/voice';
import { pubsub } from '../../utils/pubsub';
import type { Context } from '../../utils/trpc';
import { resolveVoiceChannelId } from '../resolve-voice-channel-id';

describe('resolveVoiceChannelId', () => {
  test('should return ctx.currentVoiceChannelId when set', async () => {
    const { caller } = await initTest(1);
    const runtime = new VoiceRuntime(2);

    await runtime.init();

    try {
      await caller.voice.join({
        channelId: 2,
        state: { micMuted: false, soundMuted: false }
      });

      const ctx = {
        currentVoiceChannelId: 2,
        user: { id: 1 }
      } as Context;

      expect(resolveVoiceChannelId(ctx)).toBe(2);
    } finally {
      await caller.voice.leave();
      await runtime.destroy();
    }
  });

  test('should fall back to voice runtime and hydrate ctx when unset', async () => {
    const { caller } = await initTest(1);
    const runtime = new VoiceRuntime(2);

    await runtime.init();

    try {
      await caller.voice.join({
        channelId: 2,
        state: { micMuted: false, soundMuted: false }
      });

      const ctx = {
        currentVoiceChannelId: undefined,
        user: { id: 1 }
      } as Context;

      expect(resolveVoiceChannelId(ctx)).toBe(2);
      expect(ctx.currentVoiceChannelId).toBe(2);
    } finally {
      await caller.voice.leave();
      await runtime.destroy();
    }
  });

  test('should deliver channel-scoped new producer events to subscribers', async () => {
    const received: Array<{
      channelId: number;
      remoteId: number;
      kind: StreamKind;
    }> = [];

    const subscription = pubsub.subscribeForChannel(
      2,
      ServerEvents.VOICE_NEW_PRODUCER
    );

    const unsub = subscription.subscribe({
      next: (event) => {
        received.push(event);
      }
    });

    try {
      pubsub.publishForChannel(2, ServerEvents.VOICE_NEW_PRODUCER, {
        channelId: 2,
        remoteId: 3,
        kind: StreamKind.AUDIO
      });

      // wrong channel must not deliver
      pubsub.publishForChannel(99, ServerEvents.VOICE_NEW_PRODUCER, {
        channelId: 99,
        remoteId: 4,
        kind: StreamKind.AUDIO
      });

      expect(received).toEqual([
        { channelId: 2, remoteId: 3, kind: StreamKind.AUDIO }
      ]);
    } finally {
      unsub.unsubscribe();
    }
  });
});
