const TWEMOJI_VERSION = '14.0.2';
const TWEMOJI_BASE = `https://cdn.jsdelivr.net/gh/twitter/twemoji@${TWEMOJI_VERSION}/assets/72x72`;

const toTwemojiCodepoint = (emoji: string) => {
  const codes: string[] = [];

  for (const char of emoji) {
    const code = char.codePointAt(0);

    if (code === undefined || code === 0xfe0f) continue;

    codes.push(code.toString(16));
  }

  return codes.join('-');
};

const getTwemojiUrl = (emoji: string) => {
  const codepoint = toTwemojiCodepoint(emoji);

  if (!codepoint) return undefined;

  return `${TWEMOJI_BASE}/${codepoint}.png`;
};

export { getTwemojiUrl, toTwemojiCodepoint };
