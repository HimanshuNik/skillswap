import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminSkill } from '../../lib/adminApi';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Search,
  Plus,
  BookOpen,
  Edit2,
  X,
  Power,
  RefreshCw,
} from 'lucide-react';

export const AdminSkills: React.FC = () => {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: skills = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-skills', categoryFilter, statusFilter, search],
    queryFn: () =>
      adminApi.getSkills({
        search: search.trim() || undefined,
        category: categoryFilter,
        status: statusFilter,
      }),
  });

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<AdminSkill | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Programming');
  const [formDescription, setFormDescription] = useState('');
  const [formDisabled, setFormDisabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const categories = [
    'Programming',
    'Design',
    'Languages',
    'Music',
    'Business',
    'Marketing',
    'Photography',
    'Writing',
    'Fitness',
    'Cooking',
    'General',
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  const handleOpenAdd = () => {
    setEditingSkill(null);
    setFormName('');
    setFormCategory('Programming');
    setFormDescription('');
    setFormDisabled(false);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (skill: AdminSkill) => {
    setEditingSkill(skill);
    setFormName(skill.name);
    setFormCategory(skill.category);
    setFormDescription(skill.description || '');
    setFormDisabled(Boolean(skill.isDisabled));
    setFormError(null);
    setModalOpen(true);
  };

  const handleToggleDisabled = async (skill: AdminSkill) => {
    if (!isAdmin) return;
    try {
      await adminApi.updateSkill(skill.id, { isDisabled: !skill.isDisabled });
      refetch();
    } catch (err) {
      console.error('Failed to toggle skill status:', err);
    }
  };

  const handleSubmitSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Skill name is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingSkill) {
        await adminApi.updateSkill(editingSkill.id, {
          name: formName.trim(),
          category: formCategory,
          description: formDescription.trim() || undefined,
          isDisabled: formDisabled,
        });
      } else {
        await adminApi.createSkill({
          name: formName.trim(),
          category: formCategory,
          description: formDescription.trim() || undefined,
        });
      }
      setModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save skill';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const maxUsage = Math.max(1, ...skills.map((s) => s.totalUsage));

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Skill Catalog Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize canonical topics, monitor marketplace supply and demand, and disable deprecated skills.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30 transition self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Add New Skill
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skill title or category..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9.5 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
            <span className="text-slate-400 font-medium whitespace-nowrap">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
            <span className="text-slate-400 font-medium whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All</option>
              <option value="active">Active Only</option>
              <option value="disabled">Disabled Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Skill Title</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Supply (Teachers)</th>
                <th className="py-3.5 px-4">Demand (Learners)</th>
                <th className="py-3.5 px-4">Popularity Index</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching skill catalog...
                  </td>
                </tr>
              ) : skills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No skills found matching search criteria.
                  </td>
                </tr>
              ) : (
                skills.map((s) => {
                  const popularityPercent = Math.round((s.totalUsage / maxUsage) * 100);

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      {/* Name & Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{s.name}</div>
                        {s.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{s.description}</div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {s.category}
                        </span>
                      </td>

                      {/* Teachers */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-emerald-400">{s.teachersCount}</span>
                        <span className="text-[11px] text-slate-500 ml-1">users</span>
                      </td>

                      {/* Learners */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-cyan-400">{s.learnersCount}</span>
                        <span className="text-[11px] text-slate-500 ml-1">users</span>
                      </td>

                      {/* Popularity Bar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 w-32">
                          <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              style={{ width: `${popularityPercent}%` }}
                              className="bg-emerald-500 h-full rounded-full"
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{s.totalUsage}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {s.isDisabled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Disabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Edit skill details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleDisabled(s)}
                              className={`p-1.5 rounded-lg transition ${
                                s.isDisabled
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                              }`}
                              title={s.isDisabled ? 'Enable skill' : 'Disable skill'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Skill Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                {editingSkill ? 'Edit Skill Details' : 'Add New Skill to Catalog'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSkill} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Skill Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Docker & Kubernetes, French A1, Piano"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description / Topic Scope (Optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short context of what this skill encompasses..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {editingSkill && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-xs font-semibold text-white">Disable Skill</div>
                    <div className="text-[11px] text-slate-400">
                      Hide from onboarding and search while preserving existing exchanges
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formDisabled}
                    onChange={(e) => setFormDisabled(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-500 accent-rose-500 cursor-pointer"
                  />
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingSkill ? 'Update Skill' : 'Create Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
