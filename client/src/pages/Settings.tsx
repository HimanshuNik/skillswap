import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, CreditCard, Sparkles, ArrowRight } from "lucide-react";
import AppLayout from "../components/app/AppLayout";
import { useAuthStore } from "../store/useAuthStore";
import {
  useMyProfile,
  useUpdateProfile,
  useAddTeachingSkill,
  useRemoveTeachingSkill,
  useAddLearningSkill,
  useRemoveLearningSkill,
  useUpdateAvailability,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useChangePassword,
  useDeleteAccount,
} from "../hooks/useUserProfile";
import { useSkills } from "../hooks/useSkills";
import { toast } from "sonner";
import type { SkillLevel, LearningLevel } from "../types/onboarding";
import { Modal } from "../components/ui/Modal";
import { CardSkeleton } from "../components/ui/LoadingSkeleton";
import { PushNotificationManager } from "../components/pwa/PushNotificationManager";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIME_SLOTS = ["Morning", "Afternoon", "Evening"] as const;

const TEACHING_LEVELS: SkillLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

const LEARNING_LEVELS: LearningLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

const Settings = () => {
  const { user } = useAuthStore();
  const { data: profile, isLoading } = useMyProfile();
  const { data: catalogSkills = [] } = useSkills();

  const updateProfileMutation = useUpdateProfile();
  const addTeachingSkillMutation = useAddTeachingSkill();
  const removeTeachingSkillMutation = useRemoveTeachingSkill();
  const addLearningSkillMutation = useAddLearningSkill();
  const removeLearningSkillMutation = useRemoveLearningSkill();
  const updateAvailabilityMutation = useUpdateAvailability();

  // Notification Preferences & Security Hooks
  const { data: notificationPreferences, isLoading: prefsLoading } = useNotificationPreferences();
  const updateNotificationPrefsMutation = useUpdateNotificationPreferences();
  const changePasswordMutation = useChangePassword();
  const deleteAccountMutation = useDeleteAccount();

  // Password Change Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Account Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // Profile Form State
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  // Availability State
  const [schedule, setSchedule] = useState<Array<{ day: string; slots: string[] }>>([]);
  const [timezone, setTimezone] = useState("UTC");

  // Skill Add Modal / Inline State
  const [isAddingTeach, setIsAddingTeach] = useState(false);
  const [selectedTeachSkill, setSelectedTeachSkill] = useState("");
  const [teachLevel, setTeachLevel] = useState<SkillLevel>("Intermediate");

  const [isAddingLearn, setIsAddingLearn] = useState(false);
  const [selectedLearnSkill, setSelectedLearnSkill] = useState("");
  const [learnLevel, setLearnLevel] = useState<LearningLevel>("Intermediate");

  const [prevProfile, setPrevProfile] = useState<typeof profile | null>(null);
  if (profile && prevProfile !== profile) {
    setPrevProfile(profile);
    if (profile.user) {
      setName(profile.user.name || "");
      setLocation(profile.user.location || "");
      setBio(profile.user.bio || "");
      setTimezone(profile.user.timezone || "UTC");
    }
    if (profile.availability) {
      setSchedule(profile.availability);
    }
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    updateProfileMutation.mutate({
      name: name.trim(),
      location: location.trim() || null,
      bio: bio.trim() || null,
    });
  };

  const toggleSlot = (day: string, slot: string) => {
    setSchedule((prev) => {
      const daySchedule = prev.find((d) => d.day === day) || { day, slots: [] };
      const hasSlot = daySchedule.slots.includes(slot);
      const newSlots = hasSlot
        ? daySchedule.slots.filter((s) => s !== slot)
        : [...daySchedule.slots, slot];

      return DAYS_OF_WEEK.map((d) => {
        if (d === day) return { day: d, slots: newSlots };
        const existing = prev.find((p) => p.day === d);
        return existing || { day: d, slots: [] };
      });
    });
  };

  const handleSaveAvailability = () => {
    updateAvailabilityMutation.mutate({
      schedule,
      timezone,
    });
  };

  const handleAddTeachingSkill = () => {
    if (!selectedTeachSkill) {
      toast.error("Please select a skill to teach");
      return;
    }
    const skillObj = catalogSkills.find((s) => s.name === selectedTeachSkill);
    addTeachingSkillMutation.mutate(
      {
        skillId: skillObj?.id,
        skillName: skillObj?.name || selectedTeachSkill,
        proficiencyLevel: teachLevel,
      },
      {
        onSuccess: () => {
          setIsAddingTeach(false);
          setSelectedTeachSkill("");
        },
      }
    );
  };

  const handleAddLearningSkill = () => {
    if (!selectedLearnSkill) {
      toast.error("Please select a skill to learn");
      return;
    }
    const skillObj = catalogSkills.find((s) => s.name === selectedLearnSkill);
    addLearningSkillMutation.mutate(
      {
        skillId: skillObj?.id,
        skillName: skillObj?.name || selectedLearnSkill,
        targetLevel: learnLevel,
      },
      {
        onSuccess: () => {
          setIsAddingLearn(false);
          setSelectedLearnSkill("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
            <div className="mt-2 h-8 w-48 rounded bg-slate-200 animate-pulse" />
          </div>
          <CardSkeleton count={3} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Settings</p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Account settings
          </h1>

          <p className="mt-2 text-slate-500">
            Manage your SkillSwap profile, preferences, and account.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Profile Settings */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Profile information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Update the information shown on your SkillSwap profile.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Display name
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Location
                  </label>

                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Your city (e.g. Nagpur, India)"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="bio"
                  className="text-sm font-semibold text-slate-700"
                >
                  Bio
                </label>

                <textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community a little about yourself..."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>

          {/* Skills Management */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Skills</h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage the skills you teach and the skills you want to learn.
              </p>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {/* Teaching skills */}
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Skills I can teach
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {profile?.teachingSkills.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                    >
                      <span>
                        {item.skill.name} • {item.proficiencyLevel}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTeachingSkillMutation.mutate(item.skillId)}
                        disabled={removeTeachingSkillMutation.isPending}
                        className="text-emerald-500 hover:text-rose-600"
                        title="Remove skill"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {profile?.teachingSkills.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No teaching skills added.</p>
                  )}
                </div>

                {isAddingTeach ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <select
                      value={selectedTeachSkill}
                      onChange={(e) => setSelectedTeachSkill(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="">Select a skill...</option>
                      {catalogSkills.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>

                    <select
                      value={teachLevel}
                      onChange={(e) => setTeachLevel(e.target.value as SkillLevel)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    >
                      {TEACHING_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingTeach(false)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddTeachingSkill}
                        disabled={addTeachingSkillMutation.isPending}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {addTeachingSkillMutation.isPending ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingTeach(true)}
                    className="mt-4 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                  >
                    + Add teaching skill
                  </button>
                )}
              </div>

              {/* Learning skills */}
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Skills I want to learn
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {profile?.learningSkills.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700"
                    >
                      <span>
                        {item.skill.name} • {item.targetLevel}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLearningSkillMutation.mutate(item.skillId)}
                        disabled={removeLearningSkillMutation.isPending}
                        className="text-slate-400 hover:text-rose-600"
                        title="Remove skill"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {profile?.learningSkills.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No learning skills added.</p>
                  )}
                </div>

                {isAddingLearn ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <select
                      value={selectedLearnSkill}
                      onChange={(e) => setSelectedLearnSkill(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="">Select a skill...</option>
                      {catalogSkills.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>

                    <select
                      value={learnLevel}
                      onChange={(e) => setLearnLevel(e.target.value as LearningLevel)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    >
                      {LEARNING_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingLearn(false)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddLearningSkill}
                        disabled={addLearningSkillMutation.isPending}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {addLearningSkillMutation.isPending ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingLearn(true)}
                    className="mt-4 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                  >
                    + Add learning skill
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Availability Settings */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Availability</h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose when you're usually available for SkillSwap sessions.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {DAYS_OF_WEEK.map((day) => {
                const dayObj = schedule.find((d) => d.day === day);
                const activeSlots = dayObj?.slots || [];

                return (
                  <div
                    key={day}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="font-semibold text-slate-800">{day}</p>

                    <div className="flex flex-wrap gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const isSelected = activeSlots.includes(slot);

                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => toggleSlot(day, slot)}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
                                : "border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-600"
                            }`}
                          >
                            {isSelected ? "✓ " : ""}
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="timezone"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Timezone
                  </label>

                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="Asia/Kolkata">
                      India Standard Time (IST) — Asia/Kolkata
                    </option>
                    <option value="UTC">
                      Coordinated Universal Time — UTC
                    </option>
                    <option value="Europe/London">
                      United Kingdom — Europe/London
                    </option>
                    <option value="America/New_York">
                      USA Eastern Time — America/New_York
                    </option>
                    <option value="America/Los_Angeles">
                      USA Pacific Time — America/Los_Angeles
                    </option>
                    <option value="Asia/Singapore">
                      Singapore — Asia/Singapore
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAvailability}
                  disabled={updateAvailabilityMutation.isPending}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {updateAvailabilityMutation.isPending ? "Saving..." : "Save availability"}
                </button>
              </div>
            </div>
          </section>

          {/* Notification Preferences */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Notification Preferences</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose which real-time notifications and alerts you receive.
              </p>
            </div>

            <div className="mt-6 divide-y divide-slate-200">
              {[
                {
                  key: 'swapRequests' as const,
                  title: 'Skill Swap Requests',
                  description: 'Receive alerts when someone sends, accepts, or modifies a swap request.',
                  enabled: notificationPreferences?.swapRequests ?? true,
                },
                {
                  key: 'messages' as const,
                  title: 'Chat Messages',
                  description: 'Receive real-time notifications when your swap partner sends you a message.',
                  enabled: notificationPreferences?.messages ?? true,
                },
                {
                  key: 'sessions' as const,
                  title: 'Session Updates & Reminders',
                  description: 'Get notified when sessions are scheduled, rescheduled, or ready to start.',
                  enabled: notificationPreferences?.sessions ?? true,
                },
                {
                  key: 'reviews' as const,
                  title: 'Reviews & Feedback',
                  description: 'Receive alerts when a learner posts a review for a completed session.',
                  enabled: notificationPreferences?.reviews ?? true,
                },
                {
                  key: 'emailAlerts' as const,
                  title: 'Email Notifications',
                  description: 'Receive digest notifications via email for important activity.',
                  enabled: notificationPreferences?.emailAlerts ?? true,
                },
              ].map((pref) => (
                <div
                  key={pref.key}
                  className="flex flex-col gap-4 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{pref.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{pref.description}</p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={pref.enabled}
                    disabled={updateNotificationPrefsMutation.isPending || prefsLoading}
                    onClick={() => {
                      updateNotificationPrefsMutation.mutate({
                        [pref.key]: !pref.enabled,
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 ${
                      pref.enabled ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        pref.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Browser Push Notifications */}
            <div className="mt-8 border-t border-slate-200 pt-6">
              <PushNotificationManager
                pushEnabled={notificationPreferences?.pushEnabled ?? false}
                onTogglePushEnabled={async (enabled) => {
                  await updateNotificationPrefsMutation.mutateAsync({ pushEnabled: enabled });
                }}
                isUpdatingPrefs={updateNotificationPrefsMutation.isPending}
              />

              {notificationPreferences?.pushEnabled && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Granular Push Channels
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Fine-tune which instant push alerts are dispatched to your registered devices.
                  </p>

                  <div className="mt-3 divide-y divide-slate-200">
                    {[
                      {
                        key: 'pushSwapRequests' as const,
                        label: 'Swap Requests & Status Updates',
                        enabled: notificationPreferences?.pushSwapRequests ?? true,
                      },
                      {
                        key: 'pushMessages' as const,
                        label: 'Direct Chat Messages',
                        enabled: notificationPreferences?.pushMessages ?? true,
                      },
                      {
                        key: 'pushSessions' as const,
                        label: 'Session Confirmations & Changes',
                        enabled: notificationPreferences?.pushSessions ?? true,
                      },
                      {
                        key: 'pushReminders' as const,
                        label: '15-Minute Session Reminders',
                        enabled: notificationPreferences?.pushReminders ?? true,
                      },
                      {
                        key: 'pushGroupActivity' as const,
                        label: 'Study Group Sessions & Resources',
                        enabled: notificationPreferences?.pushGroupActivity ?? true,
                      },
                    ].map((channel) => (
                      <div
                        key={channel.key}
                        className="flex items-center justify-between py-2.5 text-xs"
                      >
                        <span className="font-medium text-slate-700">{channel.label}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={channel.enabled}
                          disabled={updateNotificationPrefsMutation.isPending}
                          onClick={() => {
                            updateNotificationPrefsMutation.mutate({
                              [channel.key]: !channel.enabled,
                            });
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 ${
                            channel.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              channel.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Membership & Subscription */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-950">Membership & Billing</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    <Sparkles className="h-3 w-3" />
                    {user?.subscriptionTier || 'FREE'} Plan
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Manage your subscription tier, billing cycle, feature quotas, and tax invoice history.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/pricing"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View Plans
                </Link>
                <Link
                  to="/settings/billing"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Billing Portal</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>

          {/* Account Settings */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Account Security & Status</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage your account credentials, password, and account deactivation.
              </p>
            </div>

            <div className="mt-6 divide-y divide-slate-200">
              <div className="flex flex-col gap-4 py-5 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Change password</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Update your account password with Argon2id encryption.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setIsPasswordModalOpen(true);
                  }}
                  className="self-start rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:self-auto"
                >
                  Change password
                </button>
              </div>

              <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-red-600">Deactivate account</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Soft-deactivate your SkillSwap account and block future sign-ins.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDeletePassword("");
                    setIsDeleteModalOpen(true);
                  }}
                  className="self-start rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 sm:self-auto"
                >
                  Deactivate account
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Password"
        description="Ensure your account stays secure with a strong password."
        maxWidth="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!currentPassword) {
              toast.error("Please enter your current password");
              return;
            }
            if (newPassword.length < 8) {
              toast.error("New password must be at least 8 characters");
              return;
            }
            if (newPassword !== confirmPassword) {
              toast.error("New passwords do not match");
              return;
            }
            try {
              await changePasswordMutation.mutateAsync({
                currentPassword,
                newPassword,
              });
              setIsPasswordModalOpen(false);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            } catch {
              // Error handled in hook toast
            }
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="settings-current-pwd" className="text-xs font-semibold text-slate-700">Current Password</label>
            <div className="relative mt-1.5">
              <input
                id="settings-current-pwd"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-4 pr-11 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-r-xl"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="settings-new-pwd" className="text-xs font-semibold text-slate-700">New Password</label>
            <div className="relative mt-1.5">
              <input
                id="settings-new-pwd"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-4 pr-11 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-r-xl"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="settings-confirm-pwd" className="text-xs font-semibold text-slate-700">Confirm New Password</label>
            <div className="relative mt-1.5">
              <input
                id="settings-confirm-pwd"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Repeat new password"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-4 pr-11 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-r-xl"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Account Deletion / Deactivation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Deactivate Account"
        description="Are you sure you want to deactivate your SkillSwap account?"
        maxWidth="md"
      >
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-relaxed text-red-800" role="alert">
          <p className="font-semibold">⚠️ Account deactivation is permanent</p>
          <p className="mt-1">
            Your account will be immediately deactivated and all active sessions will be closed.
            Completed sessions and reviews are retained to protect the verified integrity of your swap partners.
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!deletePassword) {
              toast.error("Please enter your password to confirm");
              return;
            }
            try {
              await deleteAccountMutation.mutateAsync({
                password: deletePassword,
              });
            } catch {
              // Error handled in hook toast
            }
          }}
          className="mt-5 space-y-4"
        >
          <div>
            <label htmlFor="deactivate-confirm-pwd" className="text-xs font-semibold text-slate-700">
              Confirm Password to Deactivate
            </label>
            <div className="relative mt-1.5">
              <input
                id="deactivate-confirm-pwd"
                type={showDeletePassword ? "text" : "password"}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-4 pr-11 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition"
              />
              <button
                type="button"
                onClick={() => setShowDeletePassword(!showDeletePassword)}
                aria-label={showDeletePassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition focus-visible:ring-2 focus-visible:ring-red-500 rounded-r-xl"
              >
                {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleteAccountMutation.isPending}
              className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-red-500"
            >
              {deleteAccountMutation.isPending ? "Deactivating..." : "Deactivate Account"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
};

export default Settings;
