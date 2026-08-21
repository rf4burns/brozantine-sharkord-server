import { ChannelChip } from '@/components/channel-chip';
import { resolveUnicodeEmojiImage } from '@/components/emoji-picker/emoji-data';
import { parseDomCommand } from '@kurier/shared';
import { Element, type DOMNode } from 'html-react-parser';
import { CommandOverride } from '../overrides/command';
import { MentionOverride } from '../overrides/mention';
import { YoutubeOverride } from '../overrides/youtube';
import { getYoutubeInfo } from './helpers';

const hasImgChild = (domNode: Element) =>
  domNode.children.some(
    (child) => child instanceof Element && child.name === 'img'
  );

const serializer = (domNode: DOMNode, messageId: number) => {
  try {
    if (domNode instanceof Element && domNode.name === 'a') {
      const href = domNode.attribs.href;

      if (!URL.canParse(href)) {
        return undefined;
      }

      const { videoId } = getYoutubeInfo(href);

      if (videoId) {
        return <YoutubeOverride videoId={videoId} />;
      }
    } else if (domNode instanceof Element && domNode.name === 'command') {
      const command = parseDomCommand(domNode);

      return <CommandOverride command={command} />;
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === 'mention'
    ) {
      const mentionKind = domNode.attribs['data-mention-kind'];

      if (mentionKind === 'everyone' || mentionKind === 'here') {
        return <MentionOverride mentionKind={mentionKind} />;
      }

      if (domNode.attribs['data-user-id']) {
        const userId = parseInt(domNode.attribs['data-user-id'], 10);

        if (!Number.isNaN(userId)) {
          return <MentionOverride userId={userId} />;
        }
      }
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === 'channel-reference' &&
      domNode.attribs['data-channel-id']
    ) {
      const channelId = parseInt(domNode.attribs['data-channel-id'], 10);

      if (!Number.isNaN(channelId)) {
        return <ChannelChip channelId={channelId} />;
      }
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === 'emoji'
    ) {
      // already forced to an image (new TipTap output) — keep default parse
      if (hasImgChild(domNode)) {
        return undefined;
      }

      const name = domNode.attribs['data-name'];
      const src = name ? resolveUnicodeEmojiImage(name) : undefined;

      if (!src) {
        return undefined;
      }

      return (
        <img
          src={src}
          alt={name ? `:${name}:` : ''}
          className="emoji-image"
          draggable={false}
        />
      );
    }
  } catch (error) {
    console.error(`Error parsing DOM node for message ID ${messageId}:`, error);
  }

  return undefined;
};

export { serializer };
