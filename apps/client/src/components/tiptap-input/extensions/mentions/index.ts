import { getRenderedUsername } from '@/helpers/get-rendered-username';
import type { TJoinedPublicUser } from '@kurier/shared';
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import {
  MENTION_STORAGE_KEY,
  MentionSuggestion,
  type TMentionSuggestionItem
} from './suggestion';

export const MentionPluginKey = new PluginKey('mention');

type TMentionOptions = {
  users: TJoinedPublicUser[];
  canMentionEveryone: boolean;
  suggestion: typeof MentionSuggestion;
};

export const Mention = Extension.create<TMentionOptions>({
  name: MENTION_STORAGE_KEY,
  addOptions() {
    return {
      users: [],
      canMentionEveryone: false,
      suggestion: MentionSuggestion
    };
  },
  addStorage() {
    return {
      users: this.options.users,
      canMentionEveryone: this.options.canMentionEveryone
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<TMentionSuggestionItem, TMentionSuggestionItem>({
        editor: this.editor,
        pluginKey: MentionPluginKey,
        char: '@',
        startOfLine: false,
        allowSpaces: this.options.suggestion.allowSpaces,
        items: this.options.suggestion.items,
        render: this.options.suggestion.render,
        command: ({ editor, range, props }) => {
          const isSpecial = props.type === 'special';
          const displayName = isSpecial
            ? props.kind
            : getRenderedUsername(props.user);

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'mention',
                attrs: isSpecial
                  ? { mentionKind: props.kind, label: displayName }
                  : { userId: props.user.id, label: displayName }
              },
              { type: 'text', text: ' ' }
            ])
            .run();
        }
      })
    ];
  }
});
