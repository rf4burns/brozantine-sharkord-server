// custom mime so a dragged voice user is only droppable on voice channels
export const VOICE_USER_DND_MIME = 'application/x-kurier-user-id';
export const VOICE_USER_DND_TEXT_PREFIX = 'kurier-voice-user:';

let draggingVoiceUserId: number | undefined;

const beginVoiceUserDrag = (userId: number, dataTransfer: DataTransfer) => {
  draggingVoiceUserId = userId;
  dataTransfer.setData(VOICE_USER_DND_MIME, String(userId));
  dataTransfer.setData('text/plain', `${VOICE_USER_DND_TEXT_PREFIX}${userId}`);
  dataTransfer.effectAllowed = 'move';
};

const endVoiceUserDrag = () => {
  draggingVoiceUserId = undefined;
};

const isVoiceUserDrag = (dataTransfer?: DataTransfer) => {
  if (draggingVoiceUserId != null) {
    return true;
  }

  if (!dataTransfer) {
    return false;
  }

  return Array.from(dataTransfer.types).includes(VOICE_USER_DND_MIME);
};

const parseVoiceUserId = (raw: string) => {
  const trimmed = raw.startsWith(VOICE_USER_DND_TEXT_PREFIX)
    ? raw.slice(VOICE_USER_DND_TEXT_PREFIX.length)
    : raw;
  const userId = Number(trimmed);

  return Number.isFinite(userId) && userId > 0 ? userId : undefined;
};

const getVoiceUserIdFromDrop = (dataTransfer: DataTransfer) => {
  const fromMime = parseVoiceUserId(dataTransfer.getData(VOICE_USER_DND_MIME));

  if (fromMime) {
    return fromMime;
  }

  if (draggingVoiceUserId != null) {
    return draggingVoiceUserId;
  }

  return parseVoiceUserId(dataTransfer.getData('text/plain'));
};

export {
  beginVoiceUserDrag,
  endVoiceUserDrag,
  getVoiceUserIdFromDrop,
  isVoiceUserDrag
};
