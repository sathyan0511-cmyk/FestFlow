import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading campus event records...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Loader2 className="w-8 h-8 text-accent animate-spin mb-3 stroke-[2.2]" />
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{message}</p>
    </div>
  );
}
