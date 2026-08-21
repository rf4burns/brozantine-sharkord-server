import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';
import { memo } from 'react';
import { OverrideLayout } from '../overrides/layout';
import type { TFoundOpenGraph } from './types';

type TOpenGraphProps = {
  previews: TFoundOpenGraph[];
};

const OpenGraph = memo(({ previews }: TOpenGraphProps) => {
  return previews.map((preview) => {
    const title = preview.title || preview.siteName || preview.hostname;

    return (
      <OverrideLayout key={preview.key}>
        <a
          href={preview.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'flex max-w-[min(100%,460px)] flex-col overflow-hidden rounded-lg border-l-[3px] border-l-primary bg-card no-underline transition hover:bg-card/80',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
          )}
        >
          {preview.imageUrl && (
            <div className="h-40 w-full overflow-hidden bg-muted/40">
              <img
                src={preview.imageUrl}
                alt={title}
                className="block h-full w-full object-cover object-center"
                loading="lazy"
              />
            </div>
          )}

          <div className="flex flex-col gap-1 p-2.5 text-foreground">
            <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[11px]">
              {preview.faviconUrl ? (
                <img
                  src={preview.faviconUrl}
                  alt=""
                  className="h-3.5 w-3.5 shrink-0 rounded-full object-cover"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <Globe className="h-3.5 w-3.5 shrink-0" />
              )}

              <span className="min-w-0 truncate">
                {preview.siteName || preview.hostname}
              </span>
            </div>

            {title && (
              <div
                className={cn(
                  'overflow-hidden text-sm leading-5 font-semibold text-primary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]'
                )}
              >
                {title}
              </div>
            )}

            {preview.description && (
              <div className="text-muted-foreground overflow-hidden text-[13px] leading-[1.35] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                {preview.description}
              </div>
            )}
          </div>
        </a>
      </OverrideLayout>
    );
  });
});

export { OpenGraph };
