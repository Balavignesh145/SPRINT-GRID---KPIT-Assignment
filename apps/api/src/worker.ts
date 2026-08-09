/**
 * SprintGrid Background Worker
 *
 * Implements a database-backed job queue using the Job table in SQLite.
 * Runs as a separate process alongside the API server.
 *
 * Job lifecycle:
 *   PENDING → PROCESSING → COMPLETED
 *                        → RETRYING (with exponential backoff)
 *                        → FAILED (after maxAttempts exceeded)
 *
 * Job types implemented:
 *   - CHECK_OVERDUE_TASKS: Scans for tasks past due date and generates notifications
 *   - DAILY_DIGEST: Summarizes project activity per member (scheduled daily)
 *   - SEND_TASK_REMINDER: Sends a reminder for a specific task
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

const POLL_INTERVAL_MS = 15_000; // 15 seconds between polls
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 min — reclaim stalled jobs

type JobPayload = Record<string, unknown>;

async function processJob(jobId: string, type: string, payload: JobPayload): Promise<void> {
  switch (type) {
    case 'CHECK_OVERDUE_TASKS':
      return checkOverdueTasks();
    case 'DAILY_DIGEST':
      return generateDailyDigest();
    case 'SEND_TASK_REMINDER':
      return sendTaskReminder(payload);
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

async function checkOverdueTasks(): Promise<void> {
  const now = new Date();
  const overdueTasks = await prisma.task.findMany({
    where: {
      archived: false,
      dueDate: { lt: now },
      status: { notIn: ['DONE'] },
      assigneeId: { not: null }
    },
    include: {
      assignee: true,
      story: { include: { project: true } }
    }
  });

  for (const task of overdueTasks) {
    if (!task.assigneeId || !task.assignee) continue;

    // Check if we already sent an overdue notification for this task recently (within 24h)
    const recentNotification = await prisma.notification.findFirst({
      where: {
        userId: task.assigneeId,
        type: 'TASK_OVERDUE',
        body: { contains: task.id },
        createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }
    });

    if (!recentNotification) {
      await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          type: 'TASK_OVERDUE',
          title: 'Task is overdue',
          body: `Task "${task.title}" in project "${task.story.project.name}" is past its due date. [task:${task.id}]`
        }
      });
      console.log(`[worker] Overdue notification sent for task ${task.id}`);
    }
  }

  console.log(`[worker] CHECK_OVERDUE_TASKS: scanned ${overdueTasks.length} overdue tasks`);
}

async function generateDailyDigest(): Promise<void> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get all projects with recent activity
  const activeProjects = await prisma.project.findMany({
    where: {
      archived: false,
      activities: { some: { createdAt: { gt: yesterday } } }
    },
    include: {
      memberships: { include: { user: true } },
      activities: {
        where: { createdAt: { gt: yesterday } },
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  for (const project of activeProjects) {
    const activityCount = project.activities.length;
    const summary = project.activities.slice(0, 3).map((a) => `• ${a.summary}`).join('\n');

    for (const membership of project.memberships) {
      await prisma.notification.create({
        data: {
          userId: membership.userId,
          type: 'DAILY_DIGEST',
          title: `Daily digest: ${project.name}`,
          body: `${activityCount} update${activityCount !== 1 ? 's' : ''} today:\n${summary}`
        }
      });
    }
  }

  console.log(`[worker] DAILY_DIGEST: generated digest for ${activeProjects.length} projects`);
}

async function sendTaskReminder(payload: JobPayload): Promise<void> {
  const { taskId } = payload as { taskId: string };
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: true,
      story: { include: { project: true } }
    }
  });

  if (!task || !task.assigneeId || task.status === 'DONE' || task.archived) {
    console.log(`[worker] SEND_TASK_REMINDER: task ${taskId} skipped (done/archived/unassigned)`);
    return;
  }

  await prisma.notification.create({
    data: {
      userId: task.assigneeId,
      type: 'TASK_REMINDER',
      title: 'Task reminder',
      body: `Reminder: "${task.title}" in "${task.story.project.name}" is due ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'soon'}.`
    }
  });

  console.log(`[worker] SEND_TASK_REMINDER: sent reminder for task ${taskId}`);
}

/** Claim and process one pending job. Returns true if a job was processed. */
async function processNextJob(): Promise<boolean> {
  const now = new Date();

  // Reclaim stalled PROCESSING jobs (worker crashed mid-job)
  await prisma.job.updateMany({
    where: {
      status: 'PROCESSING',
      startedAt: { lt: new Date(now.getTime() - LOCK_TIMEOUT_MS) }
    },
    data: { status: 'RETRYING' }
  });

  // Claim one job atomically via update + return
  const job = await prisma.job.findFirst({
    where: {
      status: { in: ['PENDING', 'RETRYING'] },
      availableAt: { lte: now }
    },
    orderBy: { availableAt: 'asc' }
  });

  if (!job) return false;

  // Mark as processing
  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'PROCESSING', startedAt: now, attempts: { increment: 1 } }
  });

  try {
    const payload = JSON.parse(job.payload) as JobPayload;
    await processJob(job.id, job.type, payload);

    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
    console.log(`[worker] Job ${job.id} (${job.type}) completed`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const attempts = job.attempts + 1;
    const maxAttempts = job.maxAttempts;

    if (attempts >= maxAttempts) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'FAILED', lastError: error.slice(0, 500) }
      });
      console.error(`[worker] Job ${job.id} (${job.type}) FAILED after ${attempts} attempts: ${error}`);
    } else {
      // Exponential backoff: 30s * 2^attempts (capped at 1h)
      const backoffMs = Math.min(30_000 * 2 ** attempts, 3_600_000);
      const availableAt = new Date(Date.now() + backoffMs);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'RETRYING', availableAt, lastError: error.slice(0, 500) }
      });
      console.warn(`[worker] Job ${job.id} (${job.type}) will retry at ${availableAt.toISOString()}`);
    }
  }

  return true;
}

/** Schedule recurring system jobs if not already pending. */
async function scheduleRecurringJobs(): Promise<void> {
  const [overdueJob] = await Promise.all([
    prisma.job.findFirst({
      where: { type: 'CHECK_OVERDUE_TASKS', status: { in: ['PENDING', 'PROCESSING'] } }
    })
  ]);

  if (!overdueJob) {
    await prisma.job.create({
      data: {
        type: 'CHECK_OVERDUE_TASKS',
        payload: '{}',
        status: 'PENDING',
        maxAttempts: 3
      }
    });
    console.log('[worker] Scheduled CHECK_OVERDUE_TASKS');
  }
}

async function main(): Promise<void> {
  console.log('[worker] SprintGrid background worker starting...');

  // Schedule initial jobs
  await scheduleRecurringJobs();

  // Schedule daily digest at startup (will run immediately for demo)
  const digestJob = await prisma.job.findFirst({
    where: { type: 'DAILY_DIGEST', status: { in: ['PENDING', 'PROCESSING'] } }
  });
  if (!digestJob) {
    const tomorrowMidnight = new Date();
    tomorrowMidnight.setHours(8, 0, 0, 0);
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);

    await prisma.job.create({
      data: {
        type: 'DAILY_DIGEST',
        payload: '{}',
        status: 'PENDING',
        availableAt: tomorrowMidnight,
        maxAttempts: 3
      }
    });
    console.log(`[worker] Scheduled DAILY_DIGEST for ${tomorrowMidnight.toISOString()}`);
  }

  // Poll loop
  let idleCycles = 0;
  while (true) {
    try {
      const didWork = await processNextJob();
      if (didWork) {
        idleCycles = 0;
      } else {
        idleCycles++;
        // Schedule overdue check every ~10 minutes (40 idle cycles × 15s)
        if (idleCycles % 40 === 0) {
          await scheduleRecurringJobs();
        }
      }
    } catch (err) {
      console.error('[worker] Unexpected error in poll loop:', err);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});
