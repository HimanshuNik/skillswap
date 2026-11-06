import { useState } from "react";
import { toast } from "sonner";

import OnboardingLayout from "../components/onboarding/OnboardingLayout";
import ProfileStep from "../components/onboarding/ProfileStep";
import TeachSkillsStep from "../components/onboarding/TeachSkillsStep";
import LearnSkillsStep from "../components/onboarding/LearnSkillsStep";
import AvailabilityStep from "../components/onboarding/AvailabilityStep";
import { useOnboarding } from "../hooks/useOnboarding";
import { useAuthStore } from "../store/useAuthStore";

import type {
  OnboardingData,
  ProfileData,
  TeachingSkill,
  LearningSkill,
  AvailabilityData,
} from "../types/onboarding";

const Onboarding = () => {
  const { user } = useAuthStore();
  const onboardingMutation = useOnboarding();

  const [step, setStep] = useState(1);

  const [onboardingData, setOnboardingData] = useState<OnboardingData>(() => ({
    profile: {
      displayName: user?.name || "",
      bio: user?.bio || "",
      location: user?.location || "",
    },

    teachingSkills: [],

    learningSkills: [],

    availability: {
      schedule: [
        { day: "Monday", slots: [] },
        { day: "Tuesday", slots: [] },
        { day: "Wednesday", slots: [] },
        { day: "Thursday", slots: [] },
        { day: "Friday", slots: [] },
        { day: "Saturday", slots: [] },
        { day: "Sunday", slots: [] },
      ],

      sessionLength: 60,

      timezone: "Asia/Kolkata",
    },
  }));

  // Sync user details if loaded after initial mount
  const [hasSyncedUser, setHasSyncedUser] = useState(false);
  if (user?.name && !hasSyncedUser && !onboardingData.profile.displayName) {
    setHasSyncedUser(true);
    setOnboardingData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        displayName: user.name,
        location: user.location || "",
        bio: user.bio || "",
      },
    }));
  }

  const totalSteps = 4;

  const nextStep = () => {
    setStep((currentStep) => Math.min(currentStep + 1, totalSteps));
  };

  const previousStep = () => {
    setStep((currentStep) => Math.max(currentStep - 1, 1));
  };

  const updateProfile = (profile: ProfileData) => {
    setOnboardingData((currentData) => ({
      ...currentData,
      profile,
    }));
  };

  const updateTeachingSkills = (teachingSkills: TeachingSkill[]) => {
    setOnboardingData((currentData) => ({
      ...currentData,
      teachingSkills,
    }));
  };

  const updateLearningSkills = (learningSkills: LearningSkill[]) => {
    setOnboardingData((currentData) => ({
      ...currentData,
      learningSkills,
    }));
  };

  const updateAvailability = (availability: AvailabilityData) => {
    setOnboardingData((currentData) => ({
      ...currentData,
      availability,
    }));
  };

  const finishOnboarding = () => {
    // 1. Validate Step 1 (Profile)
    if (!onboardingData.profile.displayName.trim() || onboardingData.profile.displayName.trim().length < 2) {
      toast.error("Please enter a display name (at least 2 characters)");
      setStep(1);
      return;
    }

    // 2. Validate Step 2 (Teaching skills)
    if (onboardingData.teachingSkills.length === 0) {
      toast.error("Please select at least one skill you can teach");
      setStep(2);
      return;
    }

    // 3. Validate Step 3 (Learning skills)
    if (onboardingData.learningSkills.length === 0) {
      toast.error("Please select at least one skill you want to learn");
      setStep(3);
      return;
    }

    // 4. Validate Step 4 (Availability)
    const hasSlots = onboardingData.availability.schedule.some((day) => day.slots && day.slots.length > 0);
    if (!hasSlots) {
      toast.error("Please select at least one time slot for your availability");
      setStep(4);
      return;
    }

    // Submit to real backend API
    onboardingMutation.mutate(onboardingData);
  };

  return (
    <OnboardingLayout currentStep={step} totalSteps={totalSteps}>
      {step === 1 && (
        <ProfileStep
          data={onboardingData.profile}
          onUpdate={updateProfile}
          onNext={nextStep}
        />
      )}

      {step === 2 && (
        <TeachSkillsStep
          skills={onboardingData.teachingSkills}
          onUpdate={updateTeachingSkills}
          onNext={nextStep}
          onBack={previousStep}
        />
      )}

      {step === 3 && (
        <LearnSkillsStep
          skills={onboardingData.learningSkills}
          onUpdate={updateLearningSkills}
          onNext={nextStep}
          onBack={previousStep}
        />
      )}

      {step === 4 && (
        <AvailabilityStep
          data={onboardingData.availability}
          onUpdate={updateAvailability}
          onBack={previousStep}
          onFinish={finishOnboarding}
          isSubmitting={onboardingMutation.isPending}
        />
      )}
    </OnboardingLayout>
  );
};

export default Onboarding;
