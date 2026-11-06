import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../components/app/AppLayout";
import { aiApi, type CreateRoadmapPayload } from "../lib/aiApi";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  BookOpen,
  FolderGit2,
  Users,
  Star,
  ArrowRight,
  Target,
} from "lucide-react";
import { toast } from "sonner";

export const LearningRoadmapPage = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateRoadmapPayload>({
    skillName: "",
    currentProficiency: "Beginner",
    targetProficiency: "Advanced",
    learningObjective: "",
    preferredPace: "MODERATE",
  });

  const { data: roadmapsData, isLoading } = useQuery({
    queryKey: ['learning-roadmaps'],
    queryFn: async () => {
      const res = await aiApi.getRoadmaps();
      return res.data || [];
    },
  });

  const roadmaps = roadmapsData || [];
  const activeRoadmapId = selectedId || (roadmaps.length > 0 ? roadmaps[0].id : null);

  const { data: selectedRoadmapData } = useQuery({
    queryKey: ['learning-roadmap', activeRoadmapId],
    queryFn: async () => {
      if (!activeRoadmapId) return null;
      const res = await aiApi.getRoadmap(activeRoadmapId);
      return res.data;
    },
    enabled: !!activeRoadmapId,
  });

  const selectedRoadmap = selectedRoadmapData || null;

  const handleCreateRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.skillName.trim() || !formData.learningObjective.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await aiApi.createRoadmap(formData);
      toast.success(`Roadmap for "${res.data.skillName}" created successfully!`);
      setIsCreating(false);
      setFormData({
        skillName: "",
        currentProficiency: "Beginner",
        targetProficiency: "Advanced",
        learningObjective: "",
        preferredPace: "MODERATE",
      });
      setSelectedId(res.data.id);
      await queryClient.invalidateQueries({ queryKey: ['learning-roadmaps'] });
      await queryClient.invalidateQueries({ queryKey: ['learning-roadmap', res.data.id] });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to create roadmap";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMilestone = async (milestoneId: number, currentCompleted: boolean) => {
    if (!selectedRoadmap) return;
    try {
      await aiApi.updateMilestone(selectedRoadmap.id, milestoneId, !currentCompleted);
      await queryClient.invalidateQueries({ queryKey: ['learning-roadmap', selectedRoadmap.id] });
      await queryClient.invalidateQueries({ queryKey: ['learning-roadmaps'] });
      toast.success(
        !currentCompleted ? "Milestone marked as complete! 🎉" : "Milestone updated to in-progress"
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to update milestone progress";
      toast.error(errMsg);
    }
  };

  const handleDeleteRoadmap = async (roadmapId: number) => {
    if (!confirm("Are you sure you want to delete this learning roadmap?")) return;
    try {
      await aiApi.deleteRoadmap(roadmapId);
      toast.success("Roadmap deleted");
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ['learning-roadmaps'] });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to delete roadmap";
      toast.error(errMsg);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              AI Learning Roadmap
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Personalized Learning Plans
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              Custom multi-stage roadmaps generated to help you master new skills, prepare for peer exchange sessions, and connect with community mentors.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Create New Roadmap
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="mt-12 flex flex-col items-center justify-center p-12 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent mb-3" />
            <p className="text-sm">Loading your learning plans...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && roadmaps.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4">
              <Target className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Learning Roadmaps Yet</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              Tell our AI what skill you'd like to learn and your end goal. We'll generate a clear milestone-by-milestone roadmap with project ideas and connect you to peer mentors.
            </p>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              Generate Your First Roadmap
            </button>
          </div>
        )}

        {/* Roadmaps selector & details */}
        {!isLoading && roadmaps.length > 0 && selectedRoadmap && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar List (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Your Active Plans ({roadmaps.length})
              </h2>

              <div className="space-y-3">
                {roadmaps.map((r) => {
                  const isSelected = r.id === selectedRoadmap.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{r.skillName}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {r.preferredPace}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{r.currentProficiency} → {r.targetProficiency}</span>
                        <span className="font-semibold text-emerald-600">{r.progressPercent}%</span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${r.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Roadmap View (8 cols) */}
            <div className="lg:col-span-8 space-y-8">
              {/* Header Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                        {selectedRoadmap.preferredPace} PACE
                      </span>
                      <span className="text-xs text-slate-400">
                        Est. {selectedRoadmap.estimatedWeeks} weeks
                      </span>
                    </div>
                    <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                      {selectedRoadmap.skillName}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                      "{selectedRoadmap.learningObjective}"
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteRoadmap(selectedRoadmap.id)}
                    className="self-start rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    title="Delete roadmap"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Progress banner */}
                <div className="mt-6 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span>Overall Progress</span>
                    <span className="text-emerald-600 font-bold">{selectedRoadmap.progressPercent}% Completed</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${selectedRoadmap.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Milestones Checklist */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Roadmap Stages & Milestones
                </h3>

                <div className="space-y-4">
                  {selectedRoadmap.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className={`rounded-2xl border p-5 transition ${
                        milestone.isCompleted
                          ? "border-emerald-200 bg-emerald-50/30"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleMilestone(milestone.id, milestone.isCompleted)}
                          className="mt-0.5 text-emerald-600 transition hover:scale-110 focus-visible:outline-none"
                          aria-label={milestone.isCompleted ? "Mark incomplete" : "Mark completed"}
                        >
                          {milestone.isCompleted ? (
                            <CheckCircle2 className="h-6 w-6 fill-emerald-500 text-white" />
                          ) : (
                            <Circle className="h-6 w-6 text-slate-300 hover:text-emerald-500" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                              Stage {milestone.orderIndex}
                            </span>
                            <h4
                              className={`font-bold text-base ${
                                milestone.isCompleted
                                  ? "text-slate-500 line-through"
                                  : "text-slate-900"
                              }`}
                            >
                              {milestone.title}
                            </h4>
                          </div>

                          {milestone.description && (
                            <p className="mt-1 text-sm text-slate-600">
                              {milestone.description}
                            </p>
                          )}

                          {/* Topics Covered */}
                          {milestone.topics && milestone.topics.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                                <BookOpen className="h-3 w-3" /> Topics:
                              </span>
                              {milestone.topics.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Practice Projects */}
                          {milestone.practiceProjects && milestone.practiceProjects.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                                <FolderGit2 className="h-3 w-3" /> Practice Projects:
                              </span>
                              {milestone.practiceProjects.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-lg bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Suggested Session Goals */}
                          {milestone.suggestedSessionGoals && milestone.suggestedSessionGoals.length > 0 && (
                            <div className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                              <span className="font-semibold text-slate-800 block mb-1">
                                💬 Mentor Session Discussion Topics:
                              </span>
                              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                                {milestone.suggestedSessionGoals.map((g, idx) => (
                                  <li key={idx}>{g}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Community Mentors Recommendation */}
              {selectedRoadmap.suggestedPartners && selectedRoadmap.suggestedPartners.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-600" />
                    Community Mentors Teaching {selectedRoadmap.skillName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Connect with real SkillSwap members who offer this skill and schedule an exchange session.
                  </p>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedRoadmap.suggestedPartners.map((mentor) => (
                      <div
                        key={mentor.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-emerald-50/50 hover:border-emerald-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold shadow-sm">
                            {mentor.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{mentor.name}</h4>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-semibold text-slate-800">
                                {mentor.averageRating > 0 ? mentor.averageRating.toFixed(1) : "New"}
                              </span>
                              <span>({mentor.totalReviews})</span>
                            </div>
                          </div>
                        </div>

                        <Link
                          to={`/profile/${mentor.username}`}
                          className="rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-600 hover:text-white hover:border-transparent flex items-center gap-1"
                        >
                          View Profile
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Create Roadmap */}
        {isCreating && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-bold">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Create Learning Roadmap</h3>
                    <p className="text-xs text-slate-500">Tailored to your current skills and objectives</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRoadmap} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Skill you want to learn *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.skillName}
                    onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
                    placeholder="e.g. React, Python, UI/UX Design, Docker..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tip: Common aliases like "React.js" or "NodeJS" are automatically canonicalized.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Current Level
                    </label>
                    <select
                      value={formData.currentProficiency}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentProficiency: e.target.value as CreateRoadmapPayload['currentProficiency'],
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Target Goal
                    </label>
                    <select
                      value={formData.targetProficiency}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetProficiency: e.target.value as CreateRoadmapPayload['targetProficiency'],
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    >
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Learning Objective *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.learningObjective}
                    onChange={(e) => setFormData({ ...formData, learningObjective: e.target.value })}
                    placeholder="e.g. Build production full-stack web applications and master state management"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Preferred Pace
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["RELAXED", "MODERATE", "INTENSIVE"] as const).map((pace) => (
                      <button
                        key={pace}
                        type="button"
                        onClick={() => setFormData({ ...formData, preferredPace: pace })}
                        className={`rounded-2xl border py-2 text-xs font-bold transition ${
                          formData.preferredPace === pace
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {pace}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Roadmap
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LearningRoadmapPage;
