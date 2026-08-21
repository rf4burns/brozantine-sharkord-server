type THasMentionOptions = {
  isOnline?: boolean;
};

const hasUserMention = (content: string, userId: number): boolean => {
  const pattern = new RegExp(
    `<span[^>]*(?:\\bdata-type="mention"[^>]*\\bdata-user-id="${userId}"|\\bdata-user-id="${userId}"[^>]*\\bdata-type="mention")[^>]*>`
  );

  return pattern.test(content);
};

const hasEveryoneMention = (content: string): boolean =>
  /<span[^>]*(?:\bdata-type="mention"[^>]*\bdata-mention-kind="everyone"|\bdata-mention-kind="everyone"[^>]*\bdata-type="mention")[^>]*>/i.test(
    content
  );

const hasHereMention = (content: string): boolean =>
  /<span[^>]*(?:\bdata-type="mention"[^>]*\bdata-mention-kind="here"|\bdata-mention-kind="here"[^>]*\bdata-type="mention")[^>]*>/i.test(
    content
  );

const hasMention = (
  content: string | null | undefined,
  userId: number | undefined,
  options?: THasMentionOptions
): boolean => {
  if (!content || !userId) return false;

  if (hasEveryoneMention(content)) return true;

  if (options?.isOnline !== false && hasHereMention(content)) return true;

  return hasUserMention(content, userId);
};

export { hasEveryoneMention, hasHereMention, hasMention };
export type { THasMentionOptions };
