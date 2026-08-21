import { cn } from '@/lib/utils';
import { memo, useEffect, useState } from 'react';
import { formatElapsed } from './helpers';

type TElapsedTimeProps = {
  startedAt: number;
  className?: string;
};

const ElapsedTime = memo(({ startedAt, className }: TElapsedTimeProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <span className={cn('tabular-nums', className)}>
      {formatElapsed(startedAt, now)}
    </span>
  );
});

export { ElapsedTime };
