import { prisma } from '../lib/prisma.js';
import type { MembershipRole } from '@prisma/client';

/**
 * Verifies that the authenticated user is a member of the given project.
 * Optionally enforces a minimum role.
 * Returns the membership or throws a Fastify-compatible error object.
 */
export async function assertProjectMember(
  projectId: string,
  userId: string,
  requiredRoles: MembershipRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
) {
  const membership = await prisma.membership.findUnique({
    where: { projectId_userId: { projectId, userId } }
  });

  if (!membership || !requiredRoles.includes(membership.role)) {
    const err: { statusCode: number; message: string; code: string } = {
      statusCode: 403,
      message: 'You do not have permission to access this project.',
      code: 'FORBIDDEN'
    };
    throw err;
  }

  return membership;
}

/**
 * Verifies that the authenticated user owns the project (or is ADMIN).
 */
export async function assertProjectAdmin(projectId: string, userId: string) {
  return assertProjectMember(projectId, userId, ['OWNER', 'ADMIN']);
}

/**
 * Verifies that the story belongs to the specified project.
 * Returns the story or throws 404.
 */
export async function assertStoryInProject(storyId: string, projectId: string) {
  const story = await prisma.userStory.findFirst({
    where: { id: storyId, projectId, archived: false }
  });
  if (!story) {
    const err: { statusCode: number; message: string; code: string } = {
      statusCode: 404,
      message: 'Story not found.',
      code: 'NOT_FOUND'
    };
    throw err;
  }
  return story;
}

/**
 * Verifies that the task belongs to the specified story.
 * Returns the task or throws 404.
 */
export async function assertTaskInStory(taskId: string, storyId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, storyId, archived: false }
  });
  if (!task) {
    const err: { statusCode: number; message: string; code: string } = {
      statusCode: 404,
      message: 'Task not found.',
      code: 'NOT_FOUND'
    };
    throw err;
  }
  return task;
}
