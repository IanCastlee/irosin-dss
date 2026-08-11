import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  isDangerous?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Official Emergency Action",
  message,
  confirmText = "Yes, Broadcast Alert",
  isDangerous = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-red-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-scaleUp">
        <div className="flex items-center gap-3 text-red-400">
          <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">{title}</h3>
            <p className="text-xs text-red-400 font-semibold tracking-wide">MDRRMO OFFICIAL AUTHORIZATION REQUIRED</p>
          </div>
        </div>

        <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-xl text-slate-200 text-sm leading-relaxed flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-slate-100">{message}</p>
            <p className="text-xs text-slate-400 mt-2">
              This message will be dispatched immediately to registered mobile devices via Push Notification & SMS text messages.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold tracking-wide shadow-lg shadow-red-600/30 transition flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
