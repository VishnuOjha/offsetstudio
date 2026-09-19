'use client';
import { useEffect, useState } from 'react';
import { studio } from '@/lib/content';

export default function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', timeZone: studio.timezone,
    });
    const update = () => setTime(fmt.format(new Date()));
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, []);
  return <span suppressHydrationWarning>{studio.city} {time}</span>;
}
