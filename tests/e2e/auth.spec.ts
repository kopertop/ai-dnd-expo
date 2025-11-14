import { expect, test } from '@playwright/test';

test.describe('Magic link authentication', () => {
	test('hides social providers when unavailable and sends magic link', async ({ page }) => {
		const providersRequest = page.waitForResponse((response) =>
			response.url().includes('/api/auth/providers') && response.request().method() === 'GET',
		);

		await page.goto('/login');
		await providersRequest;

		await expect(page.getByRole('button', { name: 'Sign in with Google' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Sign in with Apple' })).toHaveCount(0);

		await page.getByPlaceholder('Enter your email').fill('kopertop@gmail.com');

		const magicLinkResponsePromise = page.waitForResponse((response) =>
			response.url().includes('/api/auth/sign-in/magic-link') && response.request().method() === 'POST',
		);

		page.once('dialog', (dialog) => {
			dialog.dismiss().catch(() => {
				// Ignore dialog dismissal failures in headless mode.
			});
		});

		await page.getByTestId('send-magic-link-button').click();

		const magicLinkResponse = await magicLinkResponsePromise;
		const responseStatus = magicLinkResponse.status();
		const responseText = await magicLinkResponse.text();

		if (responseStatus >= 400) {
			throw new Error(
				`Magic link request failed with status ${responseStatus}: ${responseText || '<empty body>'}`,
			);
		}

		expect([200, 204]).toContain(responseStatus);

		if (responseText.trim().length > 0) {
			const responseBody = JSON.parse(responseText);
			expect(responseBody).toMatchObject({ status: true });
		}

		const requestPayload = magicLinkResponse.request().postDataJSON();

		expect(requestPayload).toMatchObject({
			email: 'kopertop@gmail.com',
			callbackURL: expect.stringContaining('/auth/callback'),
		});
	});
});
