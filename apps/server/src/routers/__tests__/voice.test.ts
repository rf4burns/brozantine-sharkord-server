import {
  ActivityLogType,
  ChannelPermission,
  Permission,
  StreamKind
} from '@kurier/shared';
import { describe, expect, mock, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import type { Producer } from 'mediasoup/types';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import {
  activityLog,
  channelRolePermissions,
  rolePermissions,
  roles,
  userRoles
} from '../../db/schema';
import { VoiceRuntime } from '../../runtimes/voice';

// seeded private voice channel, nobody has channel permissions on it
const PRIVATE_VOICE_CHANNEL_ID = 4;

// seeded dm channel between user 3 and user 4
const DM_CHANNEL_ID = 3;

describe('voice router', () => {
  test('should rate limit excessive voice join attempts', async () => {
    const { caller } = await initTest(1);

    for (let i = 0; i < 20; i++) {
      await expect(
        caller.voice.join({
          channelId: 999999,
          state: {
            micMuted: false,
            soundMuted: false
          }
        })
      ).rejects.toThrow('Insufficient channel permissions');
    }

    await expect(
      caller.voice.join({
        channelId: 999999,
        state: {
          micMuted: false,
          soundMuted: false
        }
      })
    ).rejects.toThrow('Too many requests. Please try again shortly.');
  });

  describe('moveUser', () => {
    test('should reject when the caller lacks MOVE_MEMBERS', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: 2 })
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should reject when the target channel does not exist', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: 999999 })
      ).rejects.toThrow('Channel not found');
    });

    test('should reject when the target channel is not a voice channel', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: 1 })
      ).rejects.toThrow('Channel is not a voice channel');
    });

    test('should reject when the caller cannot view the destination channel', async () => {
      await tdb.insert(rolePermissions).values({
        roleId: 3,
        permission: Permission.MOVE_MEMBERS,
        createdAt: Date.now()
      });
      await tdb.insert(userRoles).values({
        userId: 2,
        roleId: 3,
        createdAt: Date.now()
      });

      const { caller } = await initTest(2);

      await expect(
        caller.voice.moveUser({
          userId: 4,
          channelId: PRIVATE_VOICE_CHANNEL_ID
        })
      ).rejects.toThrow('Insufficient channel permissions');
    });

    test('should reject when the caller can join but not view the private destination', async () => {
      await tdb.insert(rolePermissions).values({
        roleId: 3,
        permission: Permission.MOVE_MEMBERS,
        createdAt: Date.now()
      });
      await tdb.insert(userRoles).values({
        userId: 2,
        roleId: 3,
        createdAt: Date.now()
      });

      const { caller } = await initTest(2);

      const defaultRole = await tdb
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.isDefault, true))
        .get();

      await tdb
        .insert(channelRolePermissions)
        .values({
          channelId: PRIVATE_VOICE_CHANNEL_ID,
          roleId: defaultRole!.id,
          permission: ChannelPermission.JOIN,
          allow: true,
          createdAt: Date.now()
        })
        .execute();

      await expect(
        caller.voice.moveUser({
          userId: 4,
          channelId: PRIVATE_VOICE_CHANNEL_ID
        })
      ).rejects.toThrow('Insufficient channel permissions');
    });

    test('should allow moving when the caller can view but not join the destination', async () => {
      await tdb.insert(rolePermissions).values({
        roleId: 3,
        permission: Permission.MOVE_MEMBERS,
        createdAt: Date.now()
      });
      await tdb.insert(userRoles).values({
        userId: 2,
        roleId: 3,
        createdAt: Date.now()
      });
      await tdb.insert(channelRolePermissions).values({
        channelId: PRIVATE_VOICE_CHANNEL_ID,
        roleId: 3,
        permission: ChannelPermission.VIEW_CHANNEL,
        allow: true,
        createdAt: Date.now()
      });

      const { caller } = await initTest(2);

      const originRuntime = new VoiceRuntime(2);

      originRuntime.addUser(4, { micMuted: false, soundMuted: false });

      try {
        await expect(
          caller.voice.moveUser({
            userId: 4,
            channelId: PRIVATE_VOICE_CHANNEL_ID
          })
        ).resolves.toBeUndefined();
      } finally {
        await originRuntime.destroy();
      }
    });

    test('should allow moving a user into a channel they cannot access themselves', async () => {
      const { caller } = await initTest(1);

      const originRuntime = new VoiceRuntime(2);

      originRuntime.addUser(4, { micMuted: false, soundMuted: false });

      try {
        await expect(
          caller.voice.moveUser({
            userId: 4,
            channelId: PRIVATE_VOICE_CHANNEL_ID
          })
        ).resolves.toBeUndefined();

        const moveLog = await tdb
          .select()
          .from(activityLog)
          .where(eq(activityLog.type, ActivityLogType.USER_MOVED))
          .get();

        expect(moveLog?.userId).toBe(1);
        expect(moveLog?.details).toMatchObject({
          movedBy: 1,
          targetUserId: 4,
          targetUsername: 'User B',
          fromChannelId: 2,
          fromChannelName: 'Voice',
          toChannelId: PRIVATE_VOICE_CHANNEL_ID,
          toChannelName: 'Private Voice'
        });
      } finally {
        await originRuntime.destroy();
      }
    });

    test('should let the moved user join the destination through the one-time grant', async () => {
      const { caller: ownerCaller } = await initTest(1);
      const { caller: movedCaller } = await initTest(4);

      const originRuntime = new VoiceRuntime(2);
      const destinationRuntime = new VoiceRuntime(PRIVATE_VOICE_CHANNEL_ID);

      await destinationRuntime.init();

      originRuntime.addUser(4, { micMuted: false, soundMuted: false });

      const joinInput = {
        channelId: PRIVATE_VOICE_CHANNEL_ID,
        state: { micMuted: false, soundMuted: false }
      };

      try {
        await expect(movedCaller.voice.join(joinInput)).rejects.toThrow(
          'Insufficient channel permissions'
        );

        await ownerCaller.voice.moveUser({
          userId: 4,
          channelId: PRIVATE_VOICE_CHANNEL_ID
        });

        originRuntime.removeUser(4);

        const result = await movedCaller.voice.join(joinInput);

        expect(result.routerRtpCapabilities).toBeDefined();

        destinationRuntime.removeUser(4);

        await expect(movedCaller.voice.join(joinInput)).rejects.toThrow(
          'Insufficient channel permissions'
        );
      } finally {
        await originRuntime.destroy();
        await destinationRuntime.destroy();
      }
    });

    test('should keep the move grant when join fails because the user is still in voice', async () => {
      const { caller: ownerCaller } = await initTest(1);
      const { caller: movedCaller } = await initTest(4);

      const originRuntime = new VoiceRuntime(2);
      const destinationRuntime = new VoiceRuntime(PRIVATE_VOICE_CHANNEL_ID);

      await destinationRuntime.init();

      originRuntime.addUser(4, { micMuted: false, soundMuted: false });

      const joinInput = {
        channelId: PRIVATE_VOICE_CHANNEL_ID,
        state: { micMuted: false, soundMuted: false }
      };

      try {
        await ownerCaller.voice.moveUser({
          userId: 4,
          channelId: PRIVATE_VOICE_CHANNEL_ID
        });

        await expect(movedCaller.voice.join(joinInput)).rejects.toThrow(
          'User already in a voice channel'
        );

        originRuntime.removeUser(4);

        const result = await movedCaller.voice.join(joinInput);

        expect(result.routerRtpCapabilities).toBeDefined();
      } finally {
        await originRuntime.destroy();
        await destinationRuntime.destroy();
      }
    });

    test('should reject when the target user lacks the global voice permission', async () => {
      const { caller } = await initTest(1);

      const defaultRole = await tdb
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.isDefault, true))
        .get();

      await tdb
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, defaultRole!.id),
            eq(rolePermissions.permission, Permission.JOIN_VOICE_CHANNELS)
          )
        )
        .execute();

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: 2 })
      ).rejects.toThrow('Target user is not allowed to use voice channels');
    });

    test('should reject when the target user is not in a voice channel', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: 2 })
      ).rejects.toThrow('User is not in a voice channel');
    });

    test('should reject when the target user is in a dm call', async () => {
      const { caller } = await initTest(1);

      const dmRuntime = new VoiceRuntime(DM_CHANNEL_ID);

      dmRuntime.addUser(4, { micMuted: false, soundMuted: false });

      try {
        await expect(
          caller.voice.moveUser({ userId: 4, channelId: 2 })
        ).rejects.toThrow('User is not in a voice channel');
      } finally {
        await dmRuntime.destroy();
      }
    });

    test('should reject when moving yourself', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.voice.moveUser({ userId: 1, channelId: 2 })
      ).rejects.toThrow('You cannot move yourself.');
    });

    test('should allow moving equal or higher ranked members', async () => {
      await tdb.insert(rolePermissions).values({
        roleId: 2,
        permission: Permission.MOVE_MEMBERS,
        createdAt: Date.now()
      });

      const { caller } = await initTest(2);

      const peerRuntime = new VoiceRuntime(PRIVATE_VOICE_CHANNEL_ID);

      peerRuntime.addUser(3, { micMuted: false, soundMuted: false });

      try {
        await expect(
          caller.voice.moveUser({
            userId: 3,
            channelId: 2
          })
        ).resolves.toBeUndefined();
      } finally {
        await peerRuntime.destroy();
      }

      const ownerRuntime = new VoiceRuntime(PRIVATE_VOICE_CHANNEL_ID);

      ownerRuntime.addUser(1, { micMuted: false, soundMuted: false });

      try {
        await expect(
          caller.voice.moveUser({
            userId: 1,
            channelId: 2
          })
        ).resolves.toBeUndefined();
      } finally {
        await ownerRuntime.destroy();
      }
    });
  });

  describe('restartIce', () => {
    test('should reject when the user is not in a voice channel', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.voice.restartIce({ direction: 'send' })
      ).rejects.toThrow('User is not in a voice channel');
    });

    test('should reject when the transport does not exist', async () => {
      const { caller } = await initTest(1);
      const runtime = new VoiceRuntime(2);

      await runtime.init();

      try {
        await caller.voice.join({
          channelId: 2,
          state: {
            micMuted: false,
            soundMuted: false
          }
        });

        await expect(
          caller.voice.restartIce({ direction: 'send' })
        ).rejects.toThrow('Transport not found');
      } finally {
        await runtime.destroy();
      }
    });

    test('should return new ice parameters for send and recv transports', async () => {
      const { caller } = await initTest(1);
      const runtime = new VoiceRuntime(2);

      await runtime.init();

      try {
        await caller.voice.join({
          channelId: 2,
          state: {
            micMuted: false,
            soundMuted: false
          }
        });

        await caller.voice.createProducerTransport();
        await caller.voice.createConsumerTransport();

        const sendIce = await caller.voice.restartIce({ direction: 'send' });
        const recvIce = await caller.voice.restartIce({ direction: 'recv' });

        expect(sendIce.usernameFragment).toBeTruthy();
        expect(sendIce.password).toBeTruthy();
        expect(recvIce.usernameFragment).toBeTruthy();
        expect(recvIce.password).toBeTruthy();
      } finally {
        await runtime.destroy();
      }
    });
  });

  test('should overlay server mute flags when joining voice', async () => {
    const { caller: owner } = await initTest(1);
    const { caller } = await initTest(2);
    const runtime = new VoiceRuntime(2);

    await runtime.init();
    await owner.users.mute({
      userId: 2,
      muted: true
    });

    try {
      await caller.voice.join({
        channelId: 2,
        state: {
          micMuted: false,
          soundMuted: false
        }
      });

      const state = runtime.getUserState(2);

      expect(state.serverMuted).toBe(true);
      expect(state.micMuted).toBe(true);

      await caller.voice.updateState({
        micMuted: false
      });

      expect(runtime.getUserState(2).micMuted).toBe(true);

      await expect(
        caller.voice.produce({
          transportId: 'missing',
          kind: StreamKind.AUDIO,
          rtpParameters: {}
        })
      ).rejects.toThrow('You cannot speak while server muted or deafened.');
    } finally {
      await runtime.destroy();
    }
  });

  test('should remove audio producer on server mute and allow produce after unmute', async () => {
    const { caller: owner } = await initTest(1);
    const { caller } = await initTest(2);
    const runtime = new VoiceRuntime(2);

    await runtime.init();

    const close = mock(() => undefined);
    const mockAudioProducer = {
      kind: 'audio',
      type: 'simple',
      close,
      observer: {
        on: mock(() => undefined)
      }
    } as unknown as Producer;

    try {
      await caller.voice.join({
        channelId: 2,
        state: {
          micMuted: false,
          soundMuted: false
        }
      });

      runtime.addProducer(2, StreamKind.AUDIO, mockAudioProducer);

      expect(runtime.getProducer(StreamKind.AUDIO, 2)).toBe(mockAudioProducer);

      await owner.users.mute({
        userId: 2,
        muted: true
      });

      expect(close).toHaveBeenCalled();
      expect(runtime.getProducer(StreamKind.AUDIO, 2)).toBeUndefined();
      expect(runtime.getUserState(2).serverMuted).toBe(true);
      expect(runtime.getUserState(2).micMuted).toBe(true);

      await expect(
        caller.voice.produce({
          transportId: 'missing',
          kind: StreamKind.AUDIO,
          rtpParameters: {}
        })
      ).rejects.toThrow('You cannot speak while server muted or deafened.');

      await owner.users.mute({
        userId: 2,
        muted: false
      });

      expect(runtime.getUserState(2).serverMuted).toBe(false);
      expect(runtime.getUserState(2).micMuted).toBe(true);

      await expect(
        caller.voice.produce({
          transportId: 'missing',
          kind: StreamKind.AUDIO,
          rtpParameters: {}
        })
      ).rejects.toThrow('Producer transport not found');
    } finally {
      await runtime.destroy();
    }
  });

  test('should remove audio producer on server deafen and clear soundMuted on undeafen', async () => {
    const { caller: owner } = await initTest(1);
    const { caller } = await initTest(2);
    const runtime = new VoiceRuntime(2);

    await runtime.init();

    const close = mock(() => undefined);
    const mockAudioProducer = {
      kind: 'audio',
      type: 'simple',
      close,
      observer: {
        on: mock(() => undefined)
      }
    } as unknown as Producer;

    try {
      await caller.voice.join({
        channelId: 2,
        state: {
          micMuted: false,
          soundMuted: false
        }
      });

      runtime.addProducer(2, StreamKind.AUDIO, mockAudioProducer);

      await owner.users.deafen({
        userId: 2,
        deafened: true
      });

      expect(close).toHaveBeenCalled();
      expect(runtime.getProducer(StreamKind.AUDIO, 2)).toBeUndefined();
      expect(runtime.getUserState(2).serverDeafened).toBe(true);
      expect(runtime.getUserState(2).micMuted).toBe(true);
      expect(runtime.getUserState(2).soundMuted).toBe(true);

      await owner.users.deafen({
        userId: 2,
        deafened: false
      });

      expect(runtime.getUserState(2).serverDeafened).toBe(false);
      expect(runtime.getUserState(2).soundMuted).toBe(false);
      expect(runtime.getUserState(2).micMuted).toBe(true);
    } finally {
      await runtime.destroy();
    }
  });

  test('should reject webcam produce without ENABLE_WEBCAM', async () => {
    const { caller } = await initTest(2);
    const runtime = new VoiceRuntime(2);

    await tdb
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, 2),
          eq(rolePermissions.permission, Permission.ENABLE_WEBCAM)
        )
      )
      .execute();

    await runtime.init();

    try {
      await caller.voice.join({
        channelId: 2,
        state: {
          micMuted: false,
          soundMuted: false
        }
      });

      await expect(
        caller.voice.produce({
          transportId: 'missing',
          kind: StreamKind.VIDEO,
          rtpParameters: {}
        })
      ).rejects.toThrow('Insufficient permissions');
    } finally {
      await runtime.destroy();
    }
  });

  test('should reject screen produce without SHARE_SCREEN', async () => {
    const { caller } = await initTest(2);
    const runtime = new VoiceRuntime(2);

    await tdb
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, 2),
          eq(rolePermissions.permission, Permission.SHARE_SCREEN)
        )
      )
      .execute();

    await runtime.init();

    try {
      await caller.voice.join({
        channelId: 2,
        state: {
          micMuted: false,
          soundMuted: false
        }
      });

      await expect(
        caller.voice.produce({
          transportId: 'missing',
          kind: StreamKind.SCREEN,
          rtpParameters: {}
        })
      ).rejects.toThrow('Insufficient permissions');
    } finally {
      await runtime.destroy();
    }
  });

  test('should drop webcam and screen flags in updateState without global perms', async () => {
    const { caller } = await initTest(2);
    const runtime = new VoiceRuntime(2);

    await tdb
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, 2),
          eq(rolePermissions.permission, Permission.ENABLE_WEBCAM)
        )
      )
      .execute();

    await tdb
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, 2),
          eq(rolePermissions.permission, Permission.SHARE_SCREEN)
        )
      )
      .execute();

    await runtime.init();

    try {
      await caller.voice.join({
        channelId: 2,
        state: {
          micMuted: false,
          soundMuted: false
        }
      });

      await caller.voice.updateState({
        webcamEnabled: true,
        sharingScreen: true
      });

      const state = runtime.getUserState(2);

      expect(state.webcamEnabled).toBe(false);
      expect(state.sharingScreen).toBe(false);
    } finally {
      await runtime.destroy();
    }
  });

  describe('occupancy timers', () => {
    const joinInput = {
      channelId: 2,
      state: {
        micMuted: false,
        soundMuted: false
      }
    };

    test('should start occupancy and member timers on first join and reset on last leave', async () => {
      const { caller: first } = await initTest(1);
      const { caller: second } = await initTest(2);
      const runtime = new VoiceRuntime(2);

      await runtime.init();

      try {
        await first.voice.join(joinInput);

        const afterFirstJoin = VoiceRuntime.getVoiceMap()[2];
        const occupiedSince = afterFirstJoin?.occupiedSince;

        expect(occupiedSince).toBeDefined();
        expect(occupiedSince).not.toBeNull();

        if (occupiedSince == null) {
          throw new Error('occupancy timer did not start');
        }

        expect(afterFirstJoin?.users[1]?.joinedAt).toBe(occupiedSince);

        await second.voice.join(joinInput);

        const afterSecondJoin = VoiceRuntime.getVoiceMap()[2];

        expect(afterSecondJoin?.occupiedSince).toBe(occupiedSince);
        expect(afterSecondJoin?.users[1]?.joinedAt).toBe(occupiedSince);
        expect(typeof afterSecondJoin?.users[2]?.joinedAt).toBe('number');
        expect(afterSecondJoin?.users[2]?.joinedAt).toBeGreaterThanOrEqual(
          occupiedSince
        );

        await second.voice.leave();

        const afterSecondLeave = VoiceRuntime.getVoiceMap()[2];

        expect(afterSecondLeave?.occupiedSince).toBe(occupiedSince);
        expect(afterSecondLeave?.users[1]?.joinedAt).toBe(occupiedSince);
        expect(afterSecondLeave?.users[2]).toBeUndefined();

        await first.voice.leave();

        const afterLastLeave = VoiceRuntime.getVoiceMap()[2];

        expect(afterLastLeave?.occupiedSince).toBeNull();
        expect(afterLastLeave?.users[1]).toBeUndefined();

        await Bun.sleep(5);
        await first.voice.join(joinInput);

        const afterRejoin = VoiceRuntime.getVoiceMap()[2];
        const rejoinedAt = afterRejoin?.occupiedSince;

        expect(rejoinedAt).toBeDefined();
        expect(rejoinedAt).not.toBeNull();

        if (rejoinedAt == null) {
          throw new Error('occupancy timer did not restart');
        }

        expect(rejoinedAt).toBeGreaterThan(occupiedSince);
        expect(afterRejoin?.users[1]?.joinedAt).toBe(rejoinedAt);
      } finally {
        await runtime.destroy();
      }
    });
  });
});
