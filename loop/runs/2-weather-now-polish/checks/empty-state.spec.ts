import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures } from './fixtures';

test('first visit shows an empty state that prompts for a search', async ({ page }) => {
  await installOpenMeteoFixtures(page);

  await page.goto('/');

  const search = page.getByLabel('City', { exact: true });
  await expect(search).toBeVisible();
  await expect(search).toHaveValue('');
  await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /search/i })).toBeVisible();

  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('current-weather')).toBeHidden();
  await expect(page.getByTestId('forecast-days')).toBeHidden();
});
