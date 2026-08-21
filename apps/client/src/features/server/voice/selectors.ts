import type { IRootState } from '@/features/store';
import { createCachedSelector } from 're-reselect';

const DEFAULT_OBJECT = {};

export const voiceMapSelector = (state: IRootState) => state.server.voiceMap;

export const voiceUserStateByUserIdSelector = createCachedSelector(
  [voiceMapSelector, (_: IRootState, userId: number) => userId],
  (voiceMap, userId) => {
    for (const channel of Object.values(voiceMap)) {
      const state = channel.users[userId];

      if (state) {
        return state;
      }
    }

    return undefined;
  }
)((_, userId: number) => userId);

export const ownVoiceStateSelector = (state: IRootState) => {
  return state.server.ownVoiceState;
};

export const pinnedCardSelector = (state: IRootState) =>
  state.server.pinnedCard;

export const voiceChannelStateSelector = (
  state: IRootState,
  channelId: number
) => state.server.voiceMap[channelId];

export const voiceChannelExternalStreamsSelector = (
  state: IRootState,
  channelId: number
) => state.server.externalStreamsMap[channelId];

export const voiceChannelOccupiedSinceSelector = createCachedSelector(
  [voiceChannelStateSelector],
  (voiceState) => voiceState?.occupiedSince ?? null
)((_state: IRootState, channelId: number) => channelId);

export const voiceChannelExternalStreamsListSelector = createCachedSelector(
  voiceChannelExternalStreamsSelector,
  (externalStreamsMap) => {
    return Object.entries(externalStreamsMap || DEFAULT_OBJECT).map(
      ([streamId, stream]) => ({
        streamId: Number(streamId),
        ...stream
      })
    );
  }
)((_state: IRootState, channelId: number) => channelId);

export const voiceChannelAudioExternalStreamsSelector = createCachedSelector(
  voiceChannelExternalStreamsListSelector,
  (externalStreams) =>
    externalStreams.filter((stream) => stream.tracks?.audio === true)
)((_state: IRootState, channelId: number) => channelId);

export const voiceChannelVideoExternalStreamsSelector = createCachedSelector(
  voiceChannelExternalStreamsListSelector,
  (externalStreams) =>
    externalStreams.filter((stream) => stream.tracks?.video === true)
)((_state: IRootState, channelId: number) => channelId);

export const hideNonVideoParticipantsSelector = (state: IRootState) =>
  state.server.hideNonVideoParticipants;

export const showUserBannersInVoiceSelector = (state: IRootState) =>
  state.server.showUserBannersInVoice;

export const hideOwnScreenShareSelector = (state: IRootState) =>
  state.server.hideOwnScreenShare;

export const alwaysShowVoiceControlsSelector = (state: IRootState) =>
  state.server.alwaysShowVoiceControls;
