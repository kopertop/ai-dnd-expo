import { expect, test } from '@playwright/test';

test.describe('Google-only authentication', () => {
	test('renders only the Google provider button', async ({ page }) => {
		const providersRequest = page.waitForResponse((response) =>
			response.url().includes('/api/auth/providers') && response.request().method() === 'GET',
		);

		await page.goto('/login');
		await providersRequest;

		const googleButton = page.getByRole('button', { name: 'Sign in with Google' });

		await expect(googleButton).toBeVisible();
		await expect(page.getByText('Sign in to continue your adventure')).toBeVisible();

		// Ensure no other auth inputs/buttons are rendered
		await expect(page.getByPlaceholder('Enter your email')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Sign in with Apple' })).toHaveCount(0);
	});
});
