const TWEMOJI_VERSION = '15.1.0';
const TWEMOJI_BASE = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${TWEMOJI_VERSION}/assets/72x72`;

// text-default bases that keep FE0F in Twemoji filenames when followed by ZWJ
const FE0F_BEFORE_ZWJ = new Set([
  0x2764, // heart (heart on fire / mending heart)
  0x1f575, // detective
  0x1f3cc, // golfer
  0x26f9, // person bouncing ball
  0x1f3cb // person lifting weights
]);

// codepoints that keep FE0F in Twemoji filenames when preceded by ZWJ
const FE0F_AFTER_ZWJ = new Set([
  0x2640, // female sign
  0x2642, // male sign
  0x2695, // medical symbol
  0x2696, // scales
  0x2708, // airplane
  0x2744, // snowflake (polar bear)
  0x1f32b, // fog (face in clouds)
  0x26a7 // transgender symbol
]);

const isEyeInSpeechBubble = (codes: number[]) =>
  codes.length === 3 &&
  codes[0] === 0x1f441 &&
  codes[1] === 0x200d &&
  codes[2] === 0x1f5e8;

const toTwemojiCodepoint = (emoji: string) => {
  const codes: number[] = [];

  for (const char of emoji) {
    const code = char.codePointAt(0);

    if (code === undefined) continue;

    codes.push(code);
  }

  const withoutVariation = codes.filter((code) => code !== 0xfe0f);

  // Twemoji stores this unqualified sequence without FE0F
  if (isEyeInSpeechBubble(withoutVariation)) {
    return '1f441-200d-1f5e8';
  }

  const parts: string[] = [];

  for (let i = 0; i < withoutVariation.length; i++) {
    const code = withoutVariation[i]!;
    const prev = withoutVariation[i - 1];
    const next = withoutVariation[i + 1];

    parts.push(code.toString(16));

    if (FE0F_BEFORE_ZWJ.has(code) && next === 0x200d) {
      parts.push('fe0f');
    }

    if (FE0F_AFTER_ZWJ.has(code) && prev === 0x200d) {
      parts.push('fe0f');
    }
  }

  return parts.join('-');
};

const getTwemojiUrl = (emoji: string) => {
  const codepoint = toTwemojiCodepoint(emoji);

  if (!codepoint) return undefined;

  return `${TWEMOJI_BASE}/${codepoint}.png`;
};

export { getTwemojiUrl, toTwemojiCodepoint };
