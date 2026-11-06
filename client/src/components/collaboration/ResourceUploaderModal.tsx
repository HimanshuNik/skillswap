import React, { useState } from 'react';
import { X, Upload, Link as LinkIcon, FileText, Image as ImageIcon } from 'lucide-react';

type ResourceType = 'LINK' | 'NOTE' | 'FILE' | 'IMAGE';
type ResourceVisibility = 'MEMBERS' | 'PUBLIC';

interface ResourceUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    resourceType: ResourceType;
    url?: string;
    content?: string;
    fileName?: string;
    fileData?: string;
    mimeType?: string;
    visibility: ResourceVisibility;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const ResourceUploaderModal: React.FC<ResourceUploaderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>('LINK');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<ResourceVisibility>('MEMBERS');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit');
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (resourceType === 'LINK' && !url.trim()) {
      setError('Valid URL is required');
      return;
    }

    if (resourceType === 'NOTE' && !content.trim()) {
      setError('Note content is required');
      return;
    }

    if ((resourceType === 'FILE' || resourceType === 'IMAGE') && (!selectedFile || !fileBase64)) {
      setError('Please select a file to upload');
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        resourceType,
        url: resourceType === 'LINK' ? url.trim() : undefined,
        content: resourceType === 'NOTE' ? content.trim() : undefined,
        fileName: selectedFile?.name,
        fileData: fileBase64 || undefined,
        mimeType: selectedFile?.type,
        visibility,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save resource');
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
          <Upload className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Share Learning Material
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload cheatsheets, guides, external documentation, or study notes for your group.
        </p>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Resource Type
            </label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {(
                [
                  { type: 'LINK' as const, label: 'Link', icon: LinkIcon },
                  { type: 'NOTE' as const, label: 'Note', icon: FileText },
                  { type: 'FILE' as const, label: 'Doc/PDF', icon: Upload },
                  { type: 'IMAGE' as const, label: 'Image', icon: ImageIcon },
                ] as const
              ).map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setResourceType(type)}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2.5 text-xs font-medium border transition ${
                    resourceType === type
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., React Server Actions Reference Guide"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {resourceType === 'LINK' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Resource URL *
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://react.dev/reference/rsc/server-actions"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          )}

          {resourceType === 'NOTE' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Note Content *
              </label>
              <textarea
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your study notes or markdown summary here..."
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-mono text-xs"
              />
            </div>
          )}

          {(resourceType === 'FILE' || resourceType === 'IMAGE') && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Upload File (Max 10MB) *
              </label>
              <input
                type="file"
                required
                accept={resourceType === 'IMAGE' ? 'image/png,image/jpeg,image/webp' : '.pdf,.png,.jpg,.jpeg,.webp,.md,.txt'}
                onChange={handleFileChange}
                className="mt-1 w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-slate-800 dark:file:text-indigo-400"
              />
              {selectedFile && (
                <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Brief Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this resource helpful for the group?"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ResourceVisibility)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="MEMBERS">Group Members Only (Protected)</option>
              <option value="PUBLIC">Public</option>
            </select>
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
              {isLoading ? 'Sharing...' : 'Share Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
