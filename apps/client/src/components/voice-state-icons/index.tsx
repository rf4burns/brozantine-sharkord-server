import { cn } from '@/lib/utils';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TVoiceStateIconProps = {
  className?: string;
};

const ServerMicOffIcon = memo(({ className }: TVoiceStateIconProps) => {
  const { t } = useTranslation('sidebar');

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(className)}
      aria-label={t('serverMuted')}
    >
      <title>{t('serverMuted')}</title>
      <path
        d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
        fill="currentColor"
      />
      <path
        d="M7 11a5 5 0 0 0 10 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 16v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="18.5" cy="18.5" r="3.5" fill="currentColor" />
      <path
        d="M17 17.5h3"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
});

const ServerHeadphonesOffIcon = memo(({ className }: TVoiceStateIconProps) => {
  const { t } = useTranslation('sidebar');

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(className)}
      aria-label={t('serverDeafened')}
    >
      <title>{t('serverDeafened')}</title>
      <path
        d="M4 13a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="3" y="13" width="4" height="7" rx="1.5" fill="currentColor" />
      <rect x="17" y="13" width="4" height="7" rx="1.5" fill="currentColor" />
      <circle cx="18.5" cy="6.5" r="3.5" fill="currentColor" />
      <path
        d="M17 6.5h3"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
});

export { ServerHeadphonesOffIcon, ServerMicOffIcon };
