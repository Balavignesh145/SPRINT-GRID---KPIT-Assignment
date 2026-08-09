import { test, expect } from '@playwright/test';

test.describe('SprintGrid Agile Workflow E2E Journey', () => {
  const timestamp = Date.now();
  const testEmail = `e2e-user-${timestamp}@sprintgrid.local`;
  const testName = `E2E Test User ${timestamp}`;
  const testPassword = `Password1234!`;

  test('should complete the critical user journey', async ({ page }) => {
    // 1. Visit Landing Page
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Plan clearly.');

    // 2. Register
    await page.click('text=Get started');
    await expect(page).toHaveURL('/register');

    await page.fill('input[placeholder="Arun Kumar"]', testName);
    await page.fill('input[placeholder="you@example.com"]', testEmail);
    await page.fill('input[placeholder="••••••••"]', testPassword);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // 3. Logout
    await page.click('button:has-text("Sign out")');
    await expect(page).toHaveURL('/login');

    // 4. Login
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // 5. Create Project
    await page.click('text=New project');
    const projectName = `Proj ${timestamp.toString().slice(-4)}`;
    await page.fill('input[placeholder="Northstar launch"]', projectName);
    await page.click('button:has-text("Create project")');

    // Should redirect to the project detail page
    await expect(page).toHaveURL(/\/projects\/\w+/);
    await expect(page.locator('h1')).toContainText(projectName);

    // 6. Create Story
    await page.click('text=Add story');
    await page.fill('input[placeholder="As a user, I want to…"]', 'As an E2E tester, I want stories to pass');
    await page.fill('textarea[placeholder="Context and acceptance criteria…"]', 'Must check registration, login, and workflows');
    await page.click('button:has-text("Create story")');

    // Verify story card appears
    const storyCard = page.locator('div.rounded-xl', { hasText: 'As an E2E tester, I want stories to pass' });
    await expect(storyCard).toBeVisible();

    // 7. Create Task
    // Open the tasks list dropdown on the story card
    await storyCard.locator('button:has-text("tasks")').click();
    await storyCard.locator('button:has-text("Add task")').click();
    await storyCard.locator('input[placeholder="Task title…"]').fill('Verify E2E flows and API routes');
    await storyCard.locator('button:has-text("Add")').click();

    // Verify task is added
    await expect(storyCard.locator('text=Verify E2E flows and API routes')).toBeVisible();

    // 8. Assign Task
    const taskRow = storyCard.locator('div.flex.items-center', { hasText: 'Verify E2E flows' });
    await taskRow.locator('select').selectOption({ label: testName });
    await expect(taskRow.locator(`div[title="${testName}"]`)).toBeVisible();

    // 9. Move Task Status (Mark Done/Todo)
    await taskRow.locator('button').click();
    // Task text should now be line-through / muted
    await expect(taskRow.locator('svg')).toHaveAttribute('style', /color: var\(--color-success\)/);

    // 10. Verify Project Activity Log
    await expect(page.locator('h3:has-text("Activity")')).toBeVisible();
    await expect(page.locator('text=created task "Verify E2E flows and API routes"')).toBeVisible();

    // 11. Verify Notification Generation
    // Open notification panel
    await page.click('button[aria-label="Notifications"]');
    // Notification list should pop up
    await expect(page.locator('span:has-text("Notifications")').first()).toBeVisible();

    // Close notifications panel by clicking backdrop
    await page.click('div.fixed.inset-0.z-40');

    // 12. Logout
    await page.click('button:has-text("Sign out")');
    await expect(page).toHaveURL('/login');
  });
});
