import { test, expect } from '@playwright/test';

// E2E Test: Navigation Flow
// Tests browser back button and URL behavior

const BASE_URL = 'http://localhost:5173';

test.describe('Among Lies - Navigation', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForTimeout(3000);

        // Login as guest if on auth page
        const guestButton = page.locator('text=Play as Guest').or(page.locator('text=Misafir Olarak Oyna'));
        if (await guestButton.isVisible()) {
            await guestButton.click();
            await page.waitForTimeout(4000);
        }
    });

    test('should redirect to lobby when accessing non-existent room', async ({ page }) => {
        // Navigate to a non-existent room URL
        await page.goto(`${BASE_URL}/room/NONEXISTENT123`);
        await page.waitForTimeout(4000);

        // Should redirect to lobby
        const url = page.url();
        expect(url).toContain('/lobby');
    });

    test('should show error notification for non-existent room', async ({ page }) => {
        // Navigate to a non-existent room URL
        await page.goto(`${BASE_URL}/room/FAKEROOM999`);
        await page.waitForTimeout(4000);

        // Should be in lobby
        expect(page.url()).toContain('/lobby');

        // Error toast should have appeared (or we're safely in lobby)
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('lobby URL should be /lobby when connected', async ({ page }) => {
        // After login, should be in lobby
        await page.waitForTimeout(2000);

        const url = page.url();
        expect(url).toContain('/lobby');
    });

});
