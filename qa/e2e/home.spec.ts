import { expect, test } from '@playwright/test';

test('shows the Homista project workspace landing screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('homista', { exact: true })).toBeVisible();
  await expect(page.getByText('Your home project, in one place.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with phone' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue with phone' }).click();
  await expect(page.getByLabel('Phone number')).toBeVisible();
  await page.getByLabel('Phone number').fill('+919876543210');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await expect(page.getByRole('alert')).toContainText('Firebase is not set up yet');
});
