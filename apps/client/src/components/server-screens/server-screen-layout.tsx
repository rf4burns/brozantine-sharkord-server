import { cn } from '@/lib/utils';
import { Button } from '@kurier/ui';
import { X } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export type TSettingsNavItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

export type TSettingsNavGroup = {
  label?: string;
  items: TSettingsNavItem[];
};

type TServerScreenLayoutProps = {
  close: () => void;
  title: string;
  groups: TSettingsNavGroup[];
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
};

type TSettingsNavButtonProps = {
  item: TSettingsNavItem;
  selected: boolean;
  onSelect: (id: string, disabled?: boolean) => void;
};

const SettingsNavButton = memo(
  ({ item, selected, onSelect }: TSettingsNavButtonProps) => {
    const handleClick = useCallback(() => {
      onSelect(item.id, item.disabled);
    }, [item.disabled, item.id, onSelect]);

    return (
      <button
        type="button"
        disabled={item.disabled}
        onClick={handleClick}
        className={cn(
          'flex w-full rounded-[4px] px-2 py-1.5 text-left text-[15px] text-muted-foreground hover:bg-card hover:text-foreground',
          selected && 'bg-card text-foreground',
          item.disabled && 'cursor-not-allowed opacity-40'
        )}
      >
        {item.label}
      </button>
    );
  }
);

const ServerScreenLayout = memo(
  ({
    close,
    title,
    groups,
    value,
    onValueChange,
    children
  }: TServerScreenLayoutProps) => {
    const { t } = useTranslation('settings');

    const handleSelect = useCallback(
      (id: string, disabled?: boolean) => {
        if (disabled) return;
        onValueChange(id);
      },
      [onValueChange]
    );

    return (
      <div className="flex h-screen bg-sidebar text-foreground">
        <nav className="flex w-[232px] shrink-0 flex-col overflow-y-auto bg-sidebar py-8 pl-6 pr-3">
          <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-faint">
            {title}
          </div>
          {groups.map((group, groupIndex) => (
            <div key={group.label ?? groupIndex} className="mb-4">
              {group.label && (
                <div className="mb-1 mt-3 px-2 text-[11px] font-bold uppercase tracking-wide text-faint">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => (
                <SettingsNavButton
                  key={item.id}
                  item={item}
                  selected={value === item.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex h-14 items-center justify-end px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              className="h-9 w-9 rounded-full border border-border"
              title={t('closeEsc')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto px-10 pb-16">
            <div className="mx-auto max-w-6xl">{children}</div>
          </div>
        </div>
      </div>
    );
  }
);

export { ServerScreenLayout };
