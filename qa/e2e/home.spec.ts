import { expect, test } from '@playwright/test';

test('shows the Homista project workspace landing screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('homista', { exact: true })).toBeVisible();
  await expect(page.getByText('Your home project, in one place.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create your first project' })).toBeVisible();
});
