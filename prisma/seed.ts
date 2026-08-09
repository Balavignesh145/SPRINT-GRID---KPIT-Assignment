import { PrismaClient, MembershipRole, Priority, StoryStatus, TaskStatus } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with default workspace...');

  // Hash standard password for demo users
  const passwordHash = await hash('Password123!', {
    type: 2, // argon2id
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  });

  // Clean old data to avoid duplicate key conflicts
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.userStory.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const balaPasswordHash = await hash('Bala@2005', {
    type: 2,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  });

  // Create Users
  const bala = await prisma.user.create({
    data: {
      email: 'balavignesh10thactive2020@gmail.com',
      name: 'Balavignesh P',
      passwordHash: balaPasswordHash
    }
  });

  const arun = await prisma.user.create({
    data: {
      email: 'arun@sprintgrid.local',
      name: 'Arun Kumar',
      passwordHash
    }
  });

  const jane = await prisma.user.create({
    data: {
      email: 'jane@sprintgrid.local',
      name: 'Jane Doe',
      passwordHash
    }
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@sprintgrid.local',
      name: 'Bob Ross',
      passwordHash
    }
  });

  // Create Project
  const project = await prisma.project.create({
    data: {
      key: 'NSTAR',
      name: 'Northstar launch',
      description: 'A workspace dedicated to the initial release of the Northstar dashboard.',
      ownerId: arun.id
    }
  });

  // Create Memberships
  await prisma.membership.createMany({
    data: [
      { projectId: project.id, userId: bala.id, role: MembershipRole.OWNER },
      { projectId: project.id, userId: arun.id, role: MembershipRole.OWNER },
      { projectId: project.id, userId: jane.id, role: MembershipRole.MEMBER },
      { projectId: project.id, userId: bob.id, role: MembershipRole.MEMBER }
    ]
  });

  // Create User Stories
  const story1 = await prisma.userStory.create({
    data: {
      projectId: project.id,
      title: 'Define application security baseline',
      status: StoryStatus.TODO,
      priority: Priority.HIGH,
      storyPoints: 5,
      position: 1000
    }
  });

  const story2 = await prisma.userStory.create({
    data: {
      projectId: project.id,
      title: 'Implement drag-and-drop Kanban interface',
      status: StoryStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      storyPoints: 8,
      position: 2000
    }
  });

  const story3 = await prisma.userStory.create({
    data: {
      projectId: project.id,
      title: 'Setup automated E2E workflow checks',
      status: StoryStatus.DONE,
      priority: Priority.LOW,
      storyPoints: 3,
      position: 3000
    }
  });

  // Create Tasks for Story 1
  await prisma.task.createMany({
    data: [
      {
        storyId: story1.id,
        title: 'Configure Argon2id password hashing parameters',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        assigneeId: arun.id,
        position: 1000
      },
      {
        storyId: story1.id,
        title: 'Integrate Fastify rate-limiter & helmet headers',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        assigneeId: jane.id,
        position: 2000
      }
    ]
  });

  // Create Tasks for Story 2
  await prisma.task.createMany({
    data: [
      {
        storyId: story2.id,
        title: 'Setup DnDContext and VerticalListSortingStrategy',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.MEDIUM,
        assigneeId: bob.id,
        position: 1000
      },
      {
        storyId: story2.id,
        title: 'Add status mutation rollback on server failure',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        assigneeId: arun.id,
        position: 2000
      }
    ]
  });

  // Create Tasks for Story 3
  await prisma.task.createMany({
    data: [
      {
        storyId: story3.id,
        title: 'Draft Playwright integration scripts',
        status: TaskStatus.DONE,
        priority: Priority.LOW,
        assigneeId: jane.id,
        position: 1000
      }
    ]
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((err) => {
    console.error('Error during seeding:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
