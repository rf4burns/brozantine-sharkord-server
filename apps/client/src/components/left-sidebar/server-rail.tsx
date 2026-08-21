import {
  requestConfirmation,
  requestTextInput
} from '@/features/dialogs/actions';
import {
  addHostFromLink,
  removeHost,
  switchHost
} from '@/features/hosts/actions';
import { setDmsOpen } from '@/features/server/actions';
import { useDirectMessagesUnreadCount } from '@/features/server/channels/hooks';
import {
  useDmsOpen,
  useInfo,
  useMentionUnreadTotal,
  usePublicServerSettings,
  useServerName
} from '@/features/server/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import {
  getSavedHostsSnapshot,
  subscribeSavedHosts
} from '@/helpers/saved-hosts';
import { cn } from '@/lib/utils';
import { Tooltip } from '@kurier/ui';
import { MessageCircleMore, Plus } from 'lucide-react';
import { memo, useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TRailButtonProps = {
  active: boolean;
  tooltip: string;
  badgeCount?: number;
  onClick: () => void;
  onContextMenu?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
};

const RailButton = memo(
  ({
    active,
    tooltip,
    badgeCount,
    onClick,
    onContextMenu,
    children
  }: TRailButtonProps) => {
    return (
      <Tooltip content={tooltip}>
        <button
          type="button"
          onClick={onClick}
          onContextMenu={onContextMenu}
          className={cn(
            'relative flex h-12 w-12 items-center justify-center overflow-hidden bg-card text-foreground transition-all',
            active ? 'rounded-[16px]' : 'rounded-[24px] hover:rounded-[16px]'
          )}
        >
          {children}
          {!!badgeCount && badgeCount > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </button>
      </Tooltip>
    );
  }
);

type TServerLogoProps = {
  logoUrl: string;
  serverName: string;
  fallback: string;
};

const ServerLogo = memo(
  ({ logoUrl, serverName, fallback }: TServerLogoProps) => {
    if (!logoUrl) {
      return <span className="text-xl font-bold">{fallback}</span>;
    }

    return (
      <img
        src={logoUrl}
        alt={serverName}
        className="h-full w-full object-cover"
      />
    );
  }
);

type THostRailItemProps = {
  host: string;
  label: string;
  logoUrl: string;
  active: boolean;
  badgeCount?: number;
  onSelect: (host: string) => void;
  onRemove: (event: React.MouseEvent<HTMLButtonElement>, host: string) => void;
};

const HostRailItem = memo(
  ({
    host,
    label,
    logoUrl,
    active,
    badgeCount,
    onSelect,
    onRemove
  }: THostRailItemProps) => {
    const handleClick = useCallback(() => {
      onSelect(host);
    }, [host, onSelect]);

    const handleContextMenu = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onRemove(event, host);
      },
      [host, onRemove]
    );

    return (
      <div className="mb-2">
        <RailButton
          active={active}
          tooltip={label}
          badgeCount={badgeCount}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          <ServerLogo
            logoUrl={logoUrl}
            serverName={label}
            fallback={label.charAt(0).toUpperCase()}
          />
        </RailButton>
      </div>
    );
  }
);

const ServerRail = memo(() => {
  const { t } = useTranslation('sidebar');
  const dmsOpen = useDmsOpen();
  const info = useInfo();
  const publicSettings = usePublicServerSettings();
  const serverName = useServerName();
  const dmUnread = useDirectMessagesUnreadCount();
  const mentionUnread = useMentionUnreadTotal();
  const { hosts, activeHost } = useSyncExternalStore(
    subscribeSavedHosts,
    getSavedHostsSnapshot,
    getSavedHostsSnapshot
  );
  const liveLogoUrl = info?.logo ? getFileUrl(info.logo) : '';

  const openDms = useCallback(() => {
    setDmsOpen(true);
  }, []);

  const onSelectHost = useCallback(
    async (host: string) => {
      if (host === activeHost) {
        setDmsOpen(false);
        return;
      }

      await switchHost(host);
      setDmsOpen(false);
    },
    [activeHost]
  );

  const onAddHost = useCallback(async () => {
    const link = await requestTextInput({
      title: t('addServerTitle'),
      message: t('addServerMsg'),
      confirmLabel: t('addServerConfirm')
    });

    if (!link) return;

    const host = await addHostFromLink(link);

    if (!host) {
      toast.error(t('invalidServerLink'));
    }
  }, [t]);

  const onRemoveHost = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>, host: string) => {
      event.preventDefault();

      const confirmed = await requestConfirmation({
        title: t('removeServerTitle'),
        message: t('removeServerMsg', { host }),
        confirmLabel: t('removeServerConfirm'),
        variant: 'danger'
      });

      if (!confirmed) return;

      await removeHost(host);
    },
    [t]
  );

  return (
    <div className="flex h-full w-[72px] shrink-0 flex-col items-center bg-rail py-3">
      {publicSettings?.directMessagesEnabled && (
        <>
          <RailButton
            active={dmsOpen}
            tooltip={t('directMessages')}
            badgeCount={dmUnread}
            onClick={openDms}
          >
            <MessageCircleMore className="h-6 w-6" />
          </RailButton>
          <div className="my-2 h-0.5 w-8 rounded-full bg-border" />
        </>
      )}
      {hosts.map((entry) => {
        const isActive = !dmsOpen && entry.host === activeHost;
        const label =
          entry.host === activeHost
            ? serverName || entry.name || entry.host
            : entry.name || entry.host;
        const logoUrl =
          entry.host === activeHost
            ? entry.logo || liveLogoUrl
            : entry.logo || '';

        const mentionBadge = isActive
          ? mentionUnread
          : entry.mentionUnread || 0;

        return (
          <HostRailItem
            key={entry.host}
            host={entry.host}
            label={label}
            logoUrl={logoUrl}
            active={isActive}
            badgeCount={mentionBadge}
            onSelect={onSelectHost}
            onRemove={onRemoveHost}
          />
        );
      })}
      <RailButton
        active={false}
        tooltip={t('addServerTitle')}
        onClick={onAddHost}
      >
        <Plus className="h-6 w-6 text-green-500" />
      </RailButton>
    </div>
  );
});

export { ServerRail };
