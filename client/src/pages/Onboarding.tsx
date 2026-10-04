import { useState } from "react";

import OnboardingLayout from "../components/onboarding/OnboardingLayout";
import ProfileStep from "../components/onboarding/ProfileStep";
import TeachSkillsStep from "../components/onboarding/TeachSkillsStep";
import LearnSkillsStep from "../components/onboarding/LearnSkillsStep";
import AvailabilityStep from "../components/onboarding/AvailabilityStep";

import type {
  OnboardingData,
  ProfileData,
  TeachingSkill,
  LearningSkill,
  AvailabilityData,
} from "../types/onboarding";

const Onboarding = () => {
  const [step, setStep] = useState(1);

  const [onboardingData, setOnboardingData] =
    useState<OnboardingData>({
      profile: {
        displayName: "",
        bio: "",
        location: "",
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
    });

  const totalSteps = 4;

  const nextStep = () => {
    setStep((currentStep) =>
      Math.min(currentStep + 1, totalSteps)
    );
  };

  const previousStep = () => {
    setStep((currentStep) =>
      Math.max(currentStep - 1, 1)
    );
  };

  const updateProfile = (profile: ProfileData) => {
    setOnboardingData((currentData) => ({
      ...currentData,
      profile,
    }));
  };

  const updateTeachingSkills = (
    teachingSkills: TeachingSkill[]
  ) => {
    setOnboardingData((currentData) => ({
      ...currentData,
      teachingSkills,
    }));
  };

  const updateLearningSkills = (
    learningSkills: LearningSkill[]
  ) => {
    setOnboardingData((currentData) => ({
      ...currentData,
      learningSkills,
    }));
  };

  const updateAvailability = (
    availability: AvailabilityData
  ) => {
    setOnboardingData((currentData) => ({
      ...currentData,
      availability,
    }));
  };

  const finishOnboarding = () => {
    console.log("Complete onboarding data:");
    console.log(onboardingData);
  };

  return (
    <OnboardingLayout
      currentStep={step}
      totalSteps={totalSteps}
    >
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
        />
      )}
    </OnboardingLayout>
  );
};

export default Onboarding;