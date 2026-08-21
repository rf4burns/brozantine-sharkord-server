import {
  getPlainTextFromHtml,
  isValidSearchQuery,
  parseSearchQuery,
  type TFile,
  type TParsedSearchQuery,
  type TSearchHasFilter
} from '@kurier/shared';
import {
  and,
  desc,
  eq,
  exists,
  gte,
  inArray,
  lt,
  sql,
  type SQL
} from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { getChannelsForUser } from '../../db/queries/channels';
import { getSettings } from '../../db/queries/server';
import {
  channels,
  files,
  messageFiles,
  messages,
  users
} from '../../db/schema';
import { attachFileToken } from '../../helpers/files-crypto';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

// this search is pretty basic and it CAN be optimized, however it might not be worth it
// some things things we can do:
// check https://sqlite.org/fts5.html for full text search capabilities, but it might be an overkill and add complexity to the codebase
// save an already pre-processed plain text version of the message content in the database to avoid having to do it in JS and speed up the search (this would require updating the existing messages and keeping it in sync for new messages, but it would make the search much faster and more accurate)
// for files the same applies, we could save a pre-processed version of the original name in lowercase to speed up the search and make it more accurate
// however, the quick test I did with close to 10k messages the request was taking around 4-8 ms, which is more than good enough

const SEARCH_QUERY_MIN_TEXT_LENGTH = 2;
const SEARCH_QUERY_MAX_LENGTH = 200;
const MESSAGE_FETCH_MULTIPLIER = 4;
const MAX_MESSAGE_FETCH_LIMIT = 100;

const MESSAGES_LIMIT = 25;
const FILES_LIMIT = 25;

const EMPTY_SEARCH_RESULT = {
  messages: [] as never[],
  files: [] as never[]
};

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, '\\$&');

const MIME_PREFIX_BY_HAS: Partial<Record<TSearchHasFilter, string>> = {
  image: 'image/',
  video: 'video/',
  sound: 'audio/'
};

const findUserIdByName = async (name: string): Promise<number | undefined> => {
  const row = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.name}) = ${name.toLowerCase()}`)
    .limit(1)
    .get();

  return row?.id;
};

const buildAttachmentExists = (has: TSearchHasFilter | undefined): SQL => {
  const mimePrefix = has ? MIME_PREFIX_BY_HAS[has] : undefined;

  return exists(
    db
      .select({ id: messageFiles.messageId })
      .from(messageFiles)
      .innerJoin(files, eq(files.id, messageFiles.fileId))
      .where(
        and(
          eq(messageFiles.messageId, messages.id),
          mimePrefix
            ? sql`${files.mimeType} LIKE ${`${mimePrefix}%`}`
            : undefined
        )
      )
  );
};

const buildMessageFilterConditions = (
  parsed: TParsedSearchQuery,
  resolved: {
    fromUserId?: number;
    mentionsUserId?: number;
    channelId?: number;
    textQuery: string;
  }
): SQL[] => {
  const conditions: SQL[] = [];

  if (resolved.fromUserId !== undefined) {
    conditions.push(eq(messages.userId, resolved.fromUserId));
  }

  if (resolved.mentionsUserId !== undefined) {
    const mentionPattern = `%data-user-id="${resolved.mentionsUserId}"%`;

    conditions.push(
      sql`coalesce(${messages.content}, '') LIKE ${mentionPattern} ESCAPE '\\'`
    );
  }

  if (resolved.channelId !== undefined) {
    conditions.push(eq(messages.channelId, resolved.channelId));
  }

  if (parsed.before !== undefined) {
    conditions.push(lt(messages.createdAt, parsed.before));
  }

  if (parsed.after !== undefined) {
    conditions.push(gte(messages.createdAt, parsed.after));
  }

  if (parsed.during) {
    conditions.push(gte(messages.createdAt, parsed.during.start));
    conditions.push(lt(messages.createdAt, parsed.during.end));
  }

  if (parsed.pinned !== undefined) {
    conditions.push(eq(messages.pinned, parsed.pinned));
  }

  if (parsed.has === 'link') {
    conditions.push(
      sql`(coalesce(${messages.content}, '') LIKE '%href=%' OR coalesce(${messages.content}, '') LIKE '%http%')`
    );
  } else if (
    parsed.has === 'file' ||
    parsed.has === 'image' ||
    parsed.has === 'video' ||
    parsed.has === 'sound'
  ) {
    conditions.push(
      buildAttachmentExists(parsed.has === 'file' ? undefined : parsed.has)
    );
  }

  if (resolved.textQuery) {
    const likePattern = `%${escapeLikePattern(resolved.textQuery)}%`;

    conditions.push(
      sql`lower(coalesce(${messages.content}, '')) LIKE ${likePattern} ESCAPE '\\'`
    );
  }

  return conditions;
};

const searchMessagesRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.search.maxRequests,
  windowMs: config.rateLimiters.search.windowMs,
  logLabel: 'search'
})
  .input(
    z.object({
      query: z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH)
    })
  )
  .query(async ({ ctx, input }) => {
    const settings = await getSettings();

    invariant(settings.enableSearch, 'Search is disabled on this server');

    const parsed = parseSearchQuery(input.query);

    invariant(
      isValidSearchQuery(parsed, SEARCH_QUERY_MIN_TEXT_LENGTH),
      'Search query is too short. Use at least 2 characters or a filter.'
    );

    const textQuery = parsed.text.toLowerCase();

    const [fromUserId, mentionsUserId] = await Promise.all([
      parsed.from ? findUserIdByName(parsed.from) : Promise.resolve(undefined),
      parsed.mentions
        ? findUserIdByName(parsed.mentions)
        : Promise.resolve(undefined)
    ]);

    if (parsed.from && fromUserId === undefined) {
      return EMPTY_SEARCH_RESULT;
    }

    if (parsed.mentions && mentionsUserId === undefined) {
      return EMPTY_SEARCH_RESULT;
    }

    const accessibleChannels = await getChannelsForUser(ctx.userId);

    const accessibleNonDmChannels = accessibleChannels.filter(
      (channel) => !channel.isDm
    );

    let channelIds = accessibleNonDmChannels.map((channel) => channel.id);

    if (parsed.in) {
      const matchedChannel = accessibleNonDmChannels.find(
        (channel) => channel.name.toLowerCase() === parsed.in!.toLowerCase()
      );

      if (!matchedChannel) {
        return EMPTY_SEARCH_RESULT;
      }

      channelIds = [matchedChannel.id];
    }

    if (channelIds.length === 0) {
      return EMPTY_SEARCH_RESULT;
    }

    const resolved = {
      fromUserId,
      mentionsUserId,
      channelId: parsed.in ? channelIds[0] : undefined,
      textQuery
    };

    const filterConditions = buildMessageFilterConditions(parsed, resolved);

    const messageWhere = and(
      inArray(messages.channelId, channelIds),
      ...filterConditions
    );

    const messageFetchLimit = textQuery
      ? Math.min(
          MESSAGES_LIMIT * MESSAGE_FETCH_MULTIPLIER,
          MAX_MESSAGE_FETCH_LIMIT
        )
      : MESSAGES_LIMIT;

    const shouldSearchFiles = textQuery.length > 0;
    const fileFilterConditions: SQL[] = [
      inArray(messages.channelId, channelIds)
    ];

    if (resolved.fromUserId !== undefined) {
      fileFilterConditions.push(eq(messages.userId, resolved.fromUserId));
    }

    if (resolved.channelId !== undefined) {
      fileFilterConditions.push(eq(messages.channelId, resolved.channelId));
    }

    if (parsed.before !== undefined) {
      fileFilterConditions.push(lt(messages.createdAt, parsed.before));
    }

    if (parsed.after !== undefined) {
      fileFilterConditions.push(gte(messages.createdAt, parsed.after));
    }

    if (parsed.during) {
      fileFilterConditions.push(gte(messages.createdAt, parsed.during.start));
      fileFilterConditions.push(lt(messages.createdAt, parsed.during.end));
    }

    if (parsed.pinned !== undefined) {
      fileFilterConditions.push(eq(messages.pinned, parsed.pinned));
    }

    if (
      parsed.has === 'image' ||
      parsed.has === 'video' ||
      parsed.has === 'sound'
    ) {
      const mimePrefix = MIME_PREFIX_BY_HAS[parsed.has]!;

      fileFilterConditions.push(
        sql`${files.mimeType} LIKE ${`${mimePrefix}%`}`
      );
    } else if (parsed.has === 'link') {
      // file-name hits are unrelated to link content; skip file search
    }

    const likePattern = textQuery
      ? `%${escapeLikePattern(textQuery)}%`
      : undefined;

    const [messageRows, fileRows] = await Promise.all([
      db
        .select({
          message: messages,
          channelName: channels.name,
          channelIsDm: channels.isDm,
          channelPrivate: channels.private
        })
        .from(messages)
        .innerJoin(channels, eq(channels.id, messages.channelId))
        .where(messageWhere)
        .orderBy(desc(messages.createdAt))
        .limit(messageFetchLimit),
      shouldSearchFiles && parsed.has !== 'link'
        ? db
            .select({
              file: files,
              messageId: messages.id,
              channelId: messages.channelId,
              messageContent: messages.content,
              messageCreatedAt: messages.createdAt,
              channelName: channels.name,
              channelIsDm: channels.isDm,
              channelPrivate: channels.private
            })
            .from(messageFiles)
            .innerJoin(files, eq(files.id, messageFiles.fileId))
            .innerJoin(messages, eq(messages.id, messageFiles.messageId))
            .innerJoin(channels, eq(channels.id, messages.channelId))
            .where(
              and(
                ...fileFilterConditions,
                likePattern
                  ? sql`lower(${files.originalName}) LIKE ${likePattern} ESCAPE '\\'`
                  : undefined
              )
            )
            .orderBy(desc(messages.createdAt))
            .limit(FILES_LIMIT)
        : Promise.resolve([])
    ]);

    const matchedMessages = textQuery
      ? messageRows
          .map((row) => {
            const plainContent = getPlainTextFromHtml(
              row.message.content ?? ''
            ).trim();

            return {
              ...row,
              plainContent
            };
          })
          .filter((row) => {
            if (!row.plainContent) {
              return false;
            }

            return row.plainContent.toLowerCase().includes(textQuery);
          })
          .slice(0, MESSAGES_LIMIT)
      : messageRows
          .map((row) => ({
            ...row,
            plainContent: getPlainTextFromHtml(row.message.content ?? '').trim()
          }))
          .slice(0, MESSAGES_LIMIT);

    const matchedMessageIds = matchedMessages.map((row) => row.message.id);

    const attachedFileRows =
      matchedMessageIds.length > 0
        ? await db
            .select({
              messageId: messageFiles.messageId,
              file: files
            })
            .from(messageFiles)
            .innerJoin(files, eq(files.id, messageFiles.fileId))
            .where(inArray(messageFiles.messageId, matchedMessageIds))
        : [];

    const filesByMessageId = new Map<number, TFile[]>();

    for (const row of attachedFileRows) {
      const list = filesByMessageId.get(row.messageId) ?? [];

      list.push({ ...row.file });
      filesByMessageId.set(row.messageId, list);
    }

    const matchedMessagesWithFiles = matchedMessages.map((row) => {
      const messageFilesForRow = filesByMessageId.get(row.message.id) ?? [];

      const preparedFiles = messageFilesForRow.map((file) =>
        attachFileToken(
          file,
          settings.storageSignedUrlsEnabled,
          settings.storageSignedUrlsTtlSeconds
        )
      );

      return {
        ...row.message,
        channelName: row.channelName,
        channelIsDm: row.channelIsDm,
        plainContent: row.plainContent,
        files: preparedFiles,
        reactions: []
      };
    });

    const matchedFiles = fileRows.map((row) => {
      const file = attachFileToken(
        row.file,
        settings.storageSignedUrlsEnabled,
        settings.storageSignedUrlsTtlSeconds
      );

      return {
        file,
        messageId: row.messageId,
        channelId: row.channelId,
        messageContent: row.messageContent,
        messageCreatedAt: row.messageCreatedAt,
        channelName: row.channelName,
        channelIsDm: row.channelIsDm
      };
    });

    return {
      messages: matchedMessagesWithFiles,
      files: matchedFiles
    };
  });

export { searchMessagesRoute };
