import React, { useState } from 'react';
import { X, Megaphone, Pin } from 'lucide-react';

interface GroupAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; isPinned: boolean }) => Promise<void>;
  isLoading?: boolean;
}

export const GroupAnnouncementModal: React.FC<GroupAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        isPinned,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish announcement');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Broadcast Group Announcement
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Publish a highlighted notification and pinned message to all active cohort members.
        </p>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Announcement Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Workshop Rescheduled & New Study Materials"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Announcement Message *
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter full announcement details for all members..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            />
            <label htmlFor="isPinned" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
              <Pin className="h-3.5 w-3.5 text-amber-500" />
              Pin this announcement to top of group board
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

