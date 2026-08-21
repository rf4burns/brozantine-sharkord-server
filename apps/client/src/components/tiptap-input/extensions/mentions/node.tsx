import { MentionChip } from '@/components/mention-chip';
import { Node } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from '@tiptap/react';
import { memo } from 'react';

const MentionNodeView = memo(({ node }: NodeViewProps) => (
  <NodeViewWrapper as="span" className="mention-inline">
    <MentionChip
      userId={node.attrs.userId != null ? Number(node.attrs.userId) : null}
      mentionKind={node.attrs.mentionKind}
      label={node.attrs.label}
    />
  </NodeViewWrapper>
));

export const MentionNode = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,

  addNodeView() {
    return ReactNodeViewRenderer(MentionNodeView, { as: 'span' });
  },

  addAttributes() {
    return {
      userId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-user-id')?.trim() || null,
        renderHTML: (attrs) =>
          attrs.userId != null ? { 'data-user-id': String(attrs.userId) } : {}
      },
      mentionKind: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-mention-kind')?.trim() || null,
        renderHTML: (attrs) =>
          attrs.mentionKind != null
            ? { 'data-mention-kind': String(attrs.mentionKind) }
            : {}
      },
      label: {
        default: '',
        parseHTML: (el) =>
          (el as HTMLElement).textContent?.replace(/^@/, '') ?? '',
        renderHTML: () => ({})
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="mention"]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const mentionKind = el.getAttribute('data-mention-kind')?.trim();
          const userId = el.getAttribute('data-user-id')?.trim();
          const label = el.textContent?.replace(/^@/, '') ?? '';

          if (mentionKind === 'everyone' || mentionKind === 'here') {
            return { mentionKind, userId: null, label: label || mentionKind };
          }

          return userId ? { userId, mentionKind: null, label } : false;
        }
      }
    ];
  },

  renderHTML({ node }) {
    const attrs: Record<string, string> = {
      'data-type': 'mention',
      class: 'mention'
    };

    if (node.attrs.mentionKind) {
      attrs['data-mention-kind'] = String(node.attrs.mentionKind);
    } else if (node.attrs.userId != null) {
      attrs['data-user-id'] = String(node.attrs.userId);
    }

    return ['span', attrs, `@${node.attrs.label ?? ''}`];
  }
});
