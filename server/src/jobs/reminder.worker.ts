import { db } from '../prisma/db.js';
import { logger } from '../config/logger.js';
import { emailService } from '../services/email.service.js';
import { pushNotificationService } from '../services/pushNotification.service.js';
import { emailJobRepository } from '../repositories/emailJob.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { skillRepository } from '../repositories/skill.repository.js';
import type { SessionRecord } from '../repositories/session.repository.js';

export async function runReminderWorkerOnce(): Promise<{
  scanned: number;
  remindersQueued: number;
  jobsProcessed: number;
}> {
  try {
    const allSessions = (await db.orm.public.Session.where({ status: 'SCHEDULED' }).all()) as unknown as SessionRecord[];
    const now = Date.now();
    let remindersQueued = 0;

    for (const session of allSessions) {
      if (!session.scheduledStart) continue;

      const startTime = new Date(session.scheduledStart).getTime();
      const diffMs = startTime - now;
      const diffHours = diffMs / (60 * 60 * 1000);

      // Check 24 hour window: 23 to 25 hours
      const is24h = diffHours >= 23 && diffHours <= 25;
      // Check 1 hour window: 0.75 to 1.25 hours (45m to 75m)
      const is1h = diffHours >= 0.75 && diffHours <= 1.25;

      if (!is24h && !is1h) continue;

      const windowLabel = is24h ? '24 hours' : '1 hour';
      const keyFragment = `session_${session.id}_${is24h ? '24h' : '1h'}`;

      const [teacher, learner, skill] = await Promise.all([
        userRepository.findById(session.teacherId),
        userRepository.findById(session.learnerId),
        skillRepository.findById(session.skillId),
      ]);

      if (!teacher || !learner || !skill) continue;

      const participants = [
        { user: teacher, partner: learner, role: 'Teacher' },
        { user: learner, partner: teacher, role: 'Learner' },
      ];

      for (const p of participants) {
        const hasDuplicate = await emailJobRepository.hasDuplicateJob(
          'SESSION_REMINDER',
          p.user.email,
          keyFragment,
          is24h ? 30 : 2
        );

        if (!hasDuplicate) {
          await emailService.enqueue({
            to: p.user.email,
            toName: p.user.name,
            userId: p.user.id,
            template: 'SESSION_REMINDER',
            subject: `Reminder: SkillSwap session with ${p.partner.name} in ${windowLabel}`,
            payload: {
              sessionId: session.id,
              key: keyFragment,
              name: p.user.name,
              partnerName: p.partner.name,
              skillName: skill.name,
              timeUntil: windowLabel,
              scheduledTime: new Date(session.scheduledStart).toLocaleString(),
              meetingUrl: session.meetingUrl || 'http://localhost:5173/sessions',
            },
          });
          remindersQueued++;

          // Dispatch instant push notification reminder
          pushNotificationService
            .sendPushToUser(
              p.user.id,
              {
                title: `Upcoming Session in ${windowLabel} ⏰`,
                body: `Your SkillSwap session on ${skill.name} with ${p.partner.name} starts in ${windowLabel}.`,
                data: {
                  url: '/sessions',
                  sessionId: session.id,
                },
              },
              'SESSION_REMINDER'
            )
            .catch((err: any) => {
              logger.debug(`[ReminderWorker] Push notification failed: ${err.message}`);
            });
        }
      }
    }

    // Process pending email delivery jobs
    const { processed } = await emailService.processPendingJobs(20);

    return {
      scanned: allSessions.length,
      remindersQueued,
      jobsProcessed: processed,
    };
  } catch (err) {
    logger.error({ err }, 'Error running reminder worker');
    return { scanned: 0, remindersQueued: 0, jobsProcessed: 0 };
  }
}
