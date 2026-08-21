import { UserAvatar } from '@/components/user-avatar';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import type { TJoinedPublicUser } from '@kurier/shared';
import type { Editor } from '@tiptap/core';
import { AtSign } from 'lucide-react';
import type { Ref } from 'react';
import { createSuggestionRenderer } from '../create-suggestion-renderer';
import { filterByQuery } from '../filter-by-query';
import { SuggestionList, type TSuggestionListRef } from '../suggestion-list';

const MENTION_STORAGE_KEY = 'mentionUsers';

type TSpecialMentionKind = 'everyone' | 'here';

type TMentionSuggestionItem =
  | { type: 'user'; user: TJoinedPublicUser }
  | { type: 'special'; kind: TSpecialMentionKind };

type TUserListProps = {
  items: TMentionSuggestionItem[];
  onSelect: (item: TMentionSuggestionItem) => void;
  ref?: Ref<TSuggestionListRef>;
};

const getKey = (item: TMentionSuggestionItem) =>
  item.type === 'user' ? item.user.id : item.kind;

const getItemName = (item: TMentionSuggestionItem) =>
  item.type === 'user' ? getRenderedUsername(item.user) : item.kind;

const renderItem = (item: TMentionSuggestionItem) => {
  if (item.type === 'special') {
    return (
      <>
        <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-medium truncate">{item.kind}</span>
      </>
    );
  }

  return (
    <>
      <UserAvatar userId={item.user.id} className="h-6 w-6 shrink-0" />
      <span className="font-medium truncate">
        {getRenderedUsername(item.user)}
      </span>
    </>
  );
};

const UserList = ({ items, onSelect, ref }: TUserListProps) => (
  <SuggestionList
    ref={ref}
    items={items}
    onSelect={onSelect}
    getKey={getKey}
    renderItem={renderItem}
    ariaLabel="Mention user"
    className="min-w-[16rem] max-w-88"
  />
);

const getSpecialMentions = (editor: Editor): TMentionSuggestionItem[] => {
  const canMentionEveryone = Boolean(
    (
      editor.storage as unknown as Record<
        string,
        { canMentionEveryone?: boolean }
      >
    )[MENTION_STORAGE_KEY]?.canMentionEveryone
  );

  if (!canMentionEveryone) {
    return [];
  }

  return [
    { type: 'special', kind: 'everyone' },
    { type: 'special', kind: 'here' }
  ];
};

const getUsers = ({
  editor,
  query
}: {
  editor: Editor;
  query: string;
}): TMentionSuggestionItem[] => {
  const users: TJoinedPublicUser[] =
    (
      editor.storage as unknown as Record<
        string,
        { users?: TJoinedPublicUser[] }
      >
    )[MENTION_STORAGE_KEY]?.users ?? [];

  const specials = filterByQuery(
    getSpecialMentions(editor),
    query,
    getItemName
  );
  const matchedUsers = filterByQuery(users, query, getRenderedUsername).map(
    (user): TMentionSuggestionItem => ({ type: 'user', user })
  );

  return [...specials, ...matchedUsers].slice(0, 10);
};

const MentionSuggestion = {
  items: getUsers,
  allowSpaces: false,
  render: createSuggestionRenderer(UserList, getUsers)
};

export { MENTION_STORAGE_KEY, MentionSuggestion };
export type { TMentionSuggestionItem, TSpecialMentionKind };
