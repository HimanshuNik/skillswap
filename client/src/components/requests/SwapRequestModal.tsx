import { useState } from 'react';
import { useCreateSwapRequest } from '../../hooks/useSwapRequests';
import type { PublicUserProfile } from '../../types/user';
import type { UserTeachingSkill, UserLearningSkill } from '../../types/user';
import { Modal } from '../ui/Modal';

interface SkillItemLike {
  skillId?: number;
  id?: number;
  skill?: { id?: number; name?: string; category?: string };
  proficiencyLevel?: string;
  targetLevel?: string;
}

interface SwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: PublicUserProfile;
  myTeachingSkills: UserTeachingSkill[];
  myLearningSkills: UserLearningSkill[];
  onSuccess?: () => void;
}

export const SwapRequestModal = ({
  isOpen,
  onClose,
  recipient,
  myTeachingSkills,
  myLearningSkills,
  onSuccess,
}: SwapRequestModalProps) => {
  const createMutation = useCreateSwapRequest();

  const getSkillId = (s: SkillItemLike | undefined): number => Number(s?.skillId ?? s?.skill?.id ?? s?.id ?? 0);

  // Skills I teach that the recipient ACTUALLY wants to learn (true reciprocal match)
  const recipientLearningSkillIds = new Set(
    (recipient.learningSkills || []).map((s) => getSkillId(s)).filter(Boolean)
  );
  const eligibleOfferedSkills = (myTeachingSkills || []).filter((s) =>
    recipientLearningSkillIds.has(getSkillId(s))
  );

  // Skills recipient teaches that I ACTUALLY want to learn (true reciprocal match)
  const myLearningSkillIds = new Set(
    (myLearningSkills || []).map((s) => getSkillId(s)).filter(Boolean)
  );
  const eligibleRequestedSkills = (recipient.teachingSkills || []).filter((s) =>
    myLearningSkillIds.has(getSkillId(s))
  );

  // Both lists must be non-empty for a valid request to be possible
  const hasReciprocalMatch = eligibleOfferedSkills.length > 0 && eligibleRequestedSkills.length > 0;

  const [customSenderSkillId, setCustomSenderSkillId] = useState<number | null>(null);
  const [customReceiverSkillId, setCustomReceiverSkillId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const senderSkillId = customSenderSkillId ?? (eligibleOfferedSkills.length > 0 ? getSkillId(eligibleOfferedSkills[0]) : 0);
  const receiverSkillId = customReceiverSkillId ?? (eligibleRequestedSkills.length > 0 ? getSkillId(eligibleRequestedSkills[0]) : 0);

  const handleClose = () => {
    setCustomSenderSkillId(null);
    setCustomReceiverSkillId(null);
    setMessage('');
    setErrorText(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (!hasReciprocalMatch) {
      setErrorText('No compatible skill exchange exists. Update your teaching or learning skills first.');
      return;
    }
    if (!senderSkillId) {
      setErrorText('Please select a skill you can teach.');
      return;
    }
    if (!receiverSkillId) {
      setErrorText('Please select a skill you want to learn.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        receiverId: recipient.id,
        senderSkillId,
        receiverSkillId,
        message: message.trim() || null,
      });

      onSuccess?.();
      handleClose();
    } catch (err: unknown) {
      // Surface the actual backend message so the user understands what went wrong
      const msg = err instanceof Error ? err.message : 'Failed to send swap request.';
      if (msg.toLowerCase().includes('learning goals') || msg.toLowerCase().includes('teaching skills')) {
        setErrorText(`${msg} Please update your skills in Settings and try again.`);
      } else if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('active swap')) {
        setErrorText('You already have an active swap request or agreement with this user.');
      } else {
        setErrorText(msg);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Propose Skill Swap"
      description={`Exchange skills with ${recipient.name}`}
      maxWidth="lg"
    >
      {errorText && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {errorText}
        </div>
      )}

      {/* No reciprocal match — block submission and explain */}
      {!hasReciprocalMatch && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">No compatible skill exchange found</p>
          <p className="text-xs leading-5">
            A skill swap requires a two-way reciprocal exchange where you teach what they want to learn, and they teach what you want to learn:
          </p>
          <ul className="mt-2 list-disc list-inside text-xs space-y-1.5">
            {eligibleRequestedSkills.length === 0 && (
              <li>
                <strong>{recipient.name}</strong> teaches{' '}
                <span className="font-semibold">
                  {recipient.teachingSkills?.length
                    ? recipient.teachingSkills.map((s) => s.skill?.name || 'Skill').join(', ')
                    : 'no skills yet'}
                </span>
                , but your learning goals are{' '}
                <span className="font-semibold">
                  {myLearningSkills?.length
                    ? myLearningSkills.map((s) => s.skill?.name || 'Skill').join(', ')
                    : 'empty'}
                </span>.
              </li>
            )}
            {eligibleOfferedSkills.length === 0 && (
              <li>
                <strong>{recipient.name}</strong> wants to learn{' '}
                <span className="font-semibold">
                  {recipient.learningSkills?.length
                    ? recipient.learningSkills.map((s) => s.skill?.name || 'Skill').join(', ')
                    : 'no skills yet'}
                </span>
                , but your teaching skills are{' '}
                <span className="font-semibold">
                  {myTeachingSkills?.length
                    ? myTeachingSkills.map((s) => s.skill?.name || 'Skill').join(', ')
                    : 'empty'}
                </span>.
              </li>
            )}
          </ul>
          <a
            href="/settings"
            className="mt-3 inline-block rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-200 transition"
          >
            Update your skills in Settings →
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Skill you offer to teach */}
        <div>
          <label htmlFor="sender-skill-select" className="block text-sm font-semibold text-slate-900">
            Skill you will teach
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Skills you teach that {recipient.name} wants to learn.
          </p>
          {eligibleOfferedSkills.length > 0 ? (
            <select
              id="sender-skill-select"
              value={senderSkillId}
              onChange={(e) => setCustomSenderSkillId(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
            >
              {eligibleOfferedSkills.map((item) => {
                const sId = getSkillId(item);
                return (
                  <option key={sId} value={sId}>
                    {item.skill?.name || 'Skill'} ({item.proficiencyLevel})
                  </option>
                );
              })}
            </select>
          ) : (
            <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">
              You haven't listed any teaching skills that match {recipient.name}'s learning goals.
            </p>
          )}
        </div>

        {/* 2. Skill you want to learn */}
        <div>
          <label htmlFor="receiver-skill-select" className="block text-sm font-semibold text-slate-900">
            Skill you want to learn
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Skills {recipient.name} teaches that you want to learn.
          </p>
          {eligibleRequestedSkills.length > 0 ? (
            <select
              id="receiver-skill-select"
              value={receiverSkillId}
              onChange={(e) => setCustomReceiverSkillId(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
            >
              {eligibleRequestedSkills.map((item) => {
                const sId = getSkillId(item);
                const level = item.proficiencyLevel || ('targetLevel' in item ? String((item as { targetLevel?: unknown }).targetLevel) : 'Skill');
                return (
                  <option key={sId} value={sId}>
                    {item.skill?.name || 'Skill'} ({level})
                  </option>
                );
              })}
            </select>
          ) : (
            <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">
              {recipient.name} has not listed any skills matching your learning goals.
            </p>
          )}
        </div>

        {/* 3. Optional message */}
        {hasReciprocalMatch && (
          <div>
            <div className="flex justify-between items-center">
              <label htmlFor="swap-intro-msg" className="block text-sm font-semibold text-slate-900">
                Introductory message <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <span className="text-xs text-slate-400">{message.length}/500</span>
            </div>
            <textarea
              id="swap-intro-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={`Introduce yourself and propose how you'd like to structure the skill swap...`}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition resize-none"
            />
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !hasReciprocalMatch || !senderSkillId || !receiverSkillId}
            className="flex-1 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {createMutation.isPending ? 'Sending Request...' : 'Send Swap Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SwapRequestModal;
