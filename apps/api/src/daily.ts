import type { PrismaClient } from '@kompri/db';
import { deleteUserData } from '@kompri/db';
import { days } from './context.ts';
import type { Mailer } from './mailer.ts';

export const inactivityNoticeDays = 14;

/**
 * Daily maintenance, run by an external scheduler (see docs/deploiement.md):
 * expiry reminders, then the inactive-account purge when a retention is set.
 * Every step is idempotent: running it twice the same day sends nothing new.
 */
export async function runDailyTasks(options: {
  db: PrismaClient;
  mailer: Mailer;
  now: Date;
  webUrl: string;
  reminderDays: number;
  inactiveAccountDays?: number | undefined;
}) {
  const { db, mailer, now, webUrl } = options;
  const report = { reminders: 0, notices: 0, deleted: 0 };

  // 1. Validations expiring soon, unless a later validation of the skill exists.
  const due = await db.validation.findMany({
    where: {
      verdict: 'PASSED',
      reminderSentAt: null,
      expiresAt: {
        gt: now,
        lte: new Date(now.getTime() + days(options.reminderDays)),
      },
    },
    include: {
      user: { select: { email: true, displayName: true } },
      skill: { select: { title: true } },
    },
  });
  const byUser = new Map<string, typeof due>();
  for (const validation of due) {
    const later = await db.validation.count({
      where: {
        userId: validation.userId,
        skillId: validation.skillId,
        expiresAt: { gt: validation.expiresAt },
      },
    });
    if (later) {
      await db.validation.update({
        where: { id: validation.id },
        data: { reminderSentAt: now },
      });
      continue;
    }
    byUser.set(validation.userId, [
      ...(byUser.get(validation.userId) ?? []),
      validation,
    ]);
  }
  const date = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
  for (const validations of byUser.values()) {
    const { user } = validations[0]!;
    await mailer.send({
      to: user.email,
      subject: 'Des compétences Kompri arrivent à expiration',
      text: [
        `Bonjour ${user.displayName ?? ''},`.trim(),
        '',
        'Ces compétences validées arrivent bientôt à expiration :',
        '',
        ...validations.map(
          (v) => `- ${v.skill.title} : jusqu’au ${date.format(v.expiresAt)}`,
        ),
        '',
        'Pour les renouveler, repasse un oral sur l’un de leurs défis :',
        new URL('/tableau-de-bord', webUrl).toString(),
      ].join('\n'),
    });
    await db.validation.updateMany({
      where: { id: { in: validations.map((v) => v.id) } },
      data: { reminderSentAt: now },
    });
    report.reminders += 1;
  }

  // 2. Inactive accounts: a notice first, deletion after the notice period.
  if (options.inactiveAccountDays) {
    const limit = new Date(now.getTime() - days(options.inactiveAccountDays));
    const noticeLimit = new Date(limit.getTime() + days(inactivityNoticeDays));
    const inactiveSince = (before: Date) => ({
      OR: [
        { lastActiveAt: { lt: before } },
        { lastActiveAt: null, createdAt: { lt: before } },
      ],
    });
    const toNotify = await db.user.findMany({
      where: { inactivityNoticeAt: null, ...inactiveSince(noticeLimit) },
      select: { id: true, email: true, displayName: true },
    });
    for (const user of toNotify) {
      await mailer.send({
        to: user.email,
        subject: 'Ton compte Kompri va être supprimé',
        text: [
          `Bonjour ${user.displayName ?? ''},`.trim(),
          '',
          `Tu ne t’es pas connecté à Kompri depuis longtemps. Sans connexion dans les ${inactivityNoticeDays} jours, ton compte et toutes ses données seront supprimés, comme le prévoit notre politique de confidentialité.`,
          '',
          `Pour le garder, connecte-toi simplement : ${new URL('/connexion', webUrl).toString()}`,
        ].join('\n'),
      });
      await db.user.update({
        where: { id: user.id },
        data: { inactivityNoticeAt: now },
      });
      report.notices += 1;
    }
    const toDelete = await db.user.findMany({
      where: {
        inactivityNoticeAt: {
          lte: new Date(now.getTime() - days(inactivityNoticeDays)),
        },
        role: 'LEARNER',
        ...inactiveSince(limit),
      },
      select: { id: true },
    });
    for (const user of toDelete) {
      await deleteUserData(db, user.id);
      report.deleted += 1;
    }
  }
  return report;
}
