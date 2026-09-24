import { expect, test } from '@playwright/test';

test('shows the Homista welcome screen and validates phone input locally', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('homista', { exact: true })).toBeVisible();
  await expect(page.getByText('Your home project, in one place.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with phone' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue with phone' }).click();
  await expect(page.getByLabel('Phone number')).toBeVisible();
  await page.getByLabel('Phone number').fill('123');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await expect(page.getByRole('alert')).toContainText('international format');
});

test('lets a signed-in user create a home project', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('homista_access_token', 'e2e-session-token'));
  await page.route('**/v1/users/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 7, phone_number: '+919876543210', display_name: 'Test Builder' }),
  }));
  await page.route('**/v1/projects', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    const payload = route.request().postDataJSON() as { name: string; location?: string };
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 31, name: payload.name, location: payload.location || null, created_at: new Date().toISOString() }),
    });
  });

  await page.goto('/');
  await expect(page.getByText(/Your home\s+projects\./)).toBeVisible();
  await page.getByRole('button', { name: 'Create a project' }).click();
  await page.getByLabel('Project name').fill('Family home');
  await page.getByLabel('Project location').fill('Pune');
  await page.getByRole('button', { name: 'Save project' }).click();

  await expect(page.getByText('Family home', { exact: true })).toBeVisible();
  await expect(page.getByText('Pune', { exact: true })).toBeVisible();
});
