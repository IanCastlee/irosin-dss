import React from 'react';
import { Loader2, Shield } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data...',
  size = 'md'
}) => {
  if (size === 'fullscreen') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center animate-pulse">
            <Shield className="w-8 h-8 text-sky-400" />
          </div>
          <Loader2 className="w-20 h-20 text-sky-500 absolute animate-spin -inset-2 opacity-60" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-slate-200">{message}</p>
          <p className="text-xs text-slate-500">MDRRMO Irosin Disaster Safety Command</p>
        </div>
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
        <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="glass-panel p-12 flex flex-col items-center justify-center space-y-3">
      <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      <p className="text-xs font-semibold text-slate-400 tracking-wide">{message}</p>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel p-5 space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-800 rounded w-3/4"></div>
              <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="h-3 bg-slate-800 rounded w-full"></div>
            <div className="h-3 bg-slate-800/60 rounded w-5/6"></div>
          </div>
          <div className="flex gap-2 pt-2">
            <div className="h-7 bg-slate-800 rounded w-16"></div>
            <div className="h-7 bg-slate-800 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
