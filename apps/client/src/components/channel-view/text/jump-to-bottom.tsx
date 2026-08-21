import { Button } from '@kurier/ui';
import { ChevronDown } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TJumpToBottomProps = {
  visible: boolean;
  unseenCount: number;
  onClick: () => void;
};

const JumpToBottom = memo(
  ({ visible, unseenCount, onClick }: TJumpToBottomProps) => {
    const { t } = useTranslation('common');

    if (!visible) {
      return null;
    }

    return (
      <div className="pointer-events-none absolute right-6 bottom-2 z-10">
        <Button
          type="button"
          size="sm"
          className="pointer-events-auto shadow-lg"
          onClick={onClick}
        >
          <ChevronDown className="h-4 w-4" />
          {unseenCount > 0
            ? t('jumpToBottomCount', { count: unseenCount })
            : t('jumpToBottom')}
        </Button>
      </div>
    );
  }
);

export { JumpToBottom };
