import {
  MentionChip,
  type TSpecialMentionKind
} from '@/components/mention-chip';
import { memo } from 'react';

type TMentionOverrideProps = {
  userId?: number;
  mentionKind?: TSpecialMentionKind;
};

const MentionOverride = memo(
  ({ userId, mentionKind }: TMentionOverrideProps) => (
    <MentionChip userId={userId} mentionKind={mentionKind} />
  )
);

export { MentionOverride };
