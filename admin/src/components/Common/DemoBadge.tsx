import React from 'react';
import { AlertCircle } from 'lucide-react';

export const DemoBadge: React.FC<{ label?: string }> = ({ label = 'DEMO DATA' }) => {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wide uppercase">
      <AlertCircle className="w-3 h-3" />
      {label}
    </span>
  );
};
