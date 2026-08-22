import { describe, expect, test } from 'bun:test';
import {
  beginVoiceUserDrag,
  endVoiceUserDrag,
  getVoiceUserIdFromDrop,
  isVoiceUserDrag,
  VOICE_USER_DND_MIME,
  VOICE_USER_DND_TEXT_PREFIX
} from '../helpers';

const createDataTransfer = () => {
  const data = new Map<string, string>();

  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    get types() {
      return [...data.keys()];
    },
    setData(type: string, value: string) {
      data.set(type, value);
    },
    getData(type: string) {
      return data.get(type) ?? '';
    }
  };
};

describe('voice user drag helpers', () => {
  test('tracks an in-memory drag even when mime types are missing', () => {
    const dataTransfer = createDataTransfer();

    beginVoiceUserDrag(7, dataTransfer as unknown as DataTransfer);

    expect(isVoiceUserDrag()).toBe(true);
    expect(isVoiceUserDrag({ types: [] } as unknown as DataTransfer)).toBe(
      true
    );

    endVoiceUserDrag();

    expect(isVoiceUserDrag()).toBe(false);
    expect(isVoiceUserDrag({ types: [] } as unknown as DataTransfer)).toBe(
      false
    );
  });

  test('writes custom mime and text/plain fallback', () => {
    const dataTransfer = createDataTransfer();

    beginVoiceUserDrag(12, dataTransfer as unknown as DataTransfer);

    expect(dataTransfer.getData(VOICE_USER_DND_MIME)).toBe('12');
    expect(dataTransfer.getData('text/plain')).toBe(
      `${VOICE_USER_DND_TEXT_PREFIX}12`
    );
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(isVoiceUserDrag(dataTransfer as unknown as DataTransfer)).toBe(true);

    endVoiceUserDrag();
  });

  test('reads the dropped user id from mime, flag, or text prefix', () => {
    const withMime = createDataTransfer();
    withMime.setData(VOICE_USER_DND_MIME, '4');
    expect(getVoiceUserIdFromDrop(withMime as unknown as DataTransfer)).toBe(4);

    const flagged = createDataTransfer();
    beginVoiceUserDrag(9, flagged as unknown as DataTransfer);
    flagged.setData(VOICE_USER_DND_MIME, '');
    expect(getVoiceUserIdFromDrop(flagged as unknown as DataTransfer)).toBe(9);
    endVoiceUserDrag();

    const plain = createDataTransfer();
    plain.setData('text/plain', `${VOICE_USER_DND_TEXT_PREFIX}15`);
    expect(getVoiceUserIdFromDrop(plain as unknown as DataTransfer)).toBe(15);

    const unrelated = createDataTransfer();
    unrelated.setData('text/plain', 'hello');
    expect(
      getVoiceUserIdFromDrop(unrelated as unknown as DataTransfer)
    ).toBeUndefined();
  });

  test('does not treat arbitrary text/plain as a voice user dragover', () => {
    expect(
      isVoiceUserDrag({
        types: ['text/plain']
      } as unknown as DataTransfer)
    ).toBe(false);

    expect(
      isVoiceUserDrag({
        types: [VOICE_USER_DND_MIME]
      } as unknown as DataTransfer)
    ).toBe(true);
  });
});
