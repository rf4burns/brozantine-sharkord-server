const EVERYONE_OR_HERE_SPAN_PATTERN =
  /<span(?=[^>]*\bdata-type="mention")(?=[^>]*\bdata-mention-kind="(everyone|here)")[^>]*>@?(?:everyone|here)<\/span>/gi;

const hasEveryoneOrHereMention = (content: string): boolean =>
  /<span[^>]*(?:\bdata-type="mention"[^>]*\bdata-mention-kind="(?:everyone|here)"|\bdata-mention-kind="(?:everyone|here)"[^>]*\bdata-type="mention")[^>]*>/i.test(
    content
  );

const stripEveryoneMentions = (html: string): string =>
  html.replace(EVERYONE_OR_HERE_SPAN_PATTERN, '@$1');

export { hasEveryoneOrHereMention, stripEveryoneMentions };
