import { Permission } from '@kurier/shared';
import { Innertube } from 'youtubei.js';
import z from 'zod';
import { config } from '../../config';
import { isDirectMessageChannel } from '../../db/queries/dms';
import { getYoutubeVideoIdFromUrl } from '../../helpers/youtube-urls';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

let innertube: Innertube | undefined;

const getInnertube = async () => {
  if (!innertube) {
    innertube = await Innertube.create();
  }

  return innertube;
};

const resolveYoutubeRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.search.maxRequests,
  windowMs: config.rateLimiters.search.windowMs,
  logLabel: 'resolveYoutube'
})
  .input(
    z.object({
      video: z.string().min(1).max(200),
      channelId: z.number().optional()
    })
  )
  .query(async ({ ctx, input }) => {
    const videoId = getYoutubeVideoIdFromUrl(input.video);

    invariant(videoId, {
      code: 'BAD_REQUEST',
      message: 'That is not a valid YouTube video.'
    });

    const isDm = input.channelId
      ? await isDirectMessageChannel(input.channelId)
      : false;

    if (!isDm) {
      await ctx.needsPermission(Permission.EMBED_LINKS);
    }

    try {
      const yt = await getInnertube();
      const info = await yt.getBasicInfo(videoId);
      let chosen;

      try {
        chosen = info.chooseFormat({ type: 'video+audio', quality: 'best' });
      } catch {
        chosen = info.chooseFormat({ type: 'audio', quality: 'best' });
      }

      const url = await chosen.decipher(yt.session.player);

      invariant(url, {
        code: 'NOT_FOUND',
        message: 'Could not play this YouTube video.'
      });

      return {
        videoId,
        url,
        mimeType: chosen.mime_type ?? 'video/mp4',
        title: info.basic_info.title ?? null
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      invariant(false, {
        code: 'NOT_FOUND',
        message: 'Could not play this YouTube video.'
      });
    }
  });

export { resolveYoutubeRoute };
