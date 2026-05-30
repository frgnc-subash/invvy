import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 p-4 backdrop-blur-md">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl shadow-stone-300/60 animate-in fade-in zoom-in duration-200 dark:border-stone-800 dark:bg-stone-950 dark:shadow-black/50">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-950 dark:text-stone-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-100"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
