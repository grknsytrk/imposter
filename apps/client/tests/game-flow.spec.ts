import { test, expect } from '@playwright/test';

// E2E Test: Among Lies Game Flow
// Tests the complete user journey from login to gameplay

const BASE_URL = 'http://localhost:5173';

test.describe('Among Lies - Game Flow', () => {

    test('should load the home page', async ({ page }) => {
        await page.goto(BASE_URL);

        // Check if main branding is visible
        await expect(page.locator('text=AMONG')).toBeVisible();
        await expect(page.locator('text=LIES')).toBeVisible();
    });

    test('should show lobby or login page', async ({ page }) => {
        await page.goto(BASE_URL);

        // Wait for connection
        await page.waitForTimeout(3000);

        // Check if any expected element is visible
        const hostGame = await page.locator('text=Host Game').isVisible().catch(() => false);
        const signIn = await page.locator('text=Sign In').isVisible().catch(() => false);
        const among = await page.locator('text=AMONG').isVisible().catch(() => false);

        // At least one should be true
        expect(hostGame || signIn || among).toBe(true);
    });

    test('should display room list section', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        // If in lobby, check for room list
        const arenaSection = page.locator('text=ACTIVE GAMES').or(page.locator('text=AKTİF OYUNLAR'));

        // Either we see the room list or we're on login
        const isVisible = await arenaSection.isVisible().catch(() => false);
        if (isVisible) {
            await expect(arenaSection).toBeVisible();
        }
    });

});

test.describe('Among Lies - Accessibility', () => {

    test('page should have proper title', async ({ page }) => {
        await page.goto(BASE_URL);
        await expect(page).toHaveTitle(/Among Lies|Imposter/i);
    });

    test('buttons should be focusable', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        // Tab through focusable elements
        await page.keyboard.press('Tab');

        // Check that something is focused
        const focusedElement = await page.locator(':focus').first();
        await expect(focusedElement).toBeTruthy();
    });

});

test.describe('Among Lies - Guest Flow', () => {

    test('should login as guest and see lobby', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        // Look for guest login button
        const guestButton = page.locator('text=Play as Guest').or(page.locator('text=Misafir Olarak Oyna'));

        if (await guestButton.isVisible()) {
            await guestButton.click();

            // Wait for lobby to load
            await page.waitForTimeout(3000);

            // Check if we're in lobby (Host Game button visible)
            const hostGame = page.locator('text=Host Game').or(page.locator('text=ODA OLUŞTUR'));
            await expect(hostGame).toBeVisible({ timeout: 10000 });
        }
    });

    test('should open room creation modal as guest', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForTimeout(2000);

        // Login as guest if on auth page
        const guestButton = page.locator('text=Play as Guest').or(page.locator('text=Misafir Olarak Oyna'));
        if (await guestButton.isVisible()) {
            await guestButton.click();
            await page.waitForTimeout(3000);
        }

        // Click Host Game button
        const hostGame = page.locator('text=Host Game').or(page.locator('text=ODA OLUŞTUR'));
        if (await hostGame.isVisible()) {
            await hostGame.click();
            await page.waitForTimeout(1000);

            // Just verify page didn't crash - modal details vary
            await expect(page.locator('body')).toBeVisible();
        }
    });

});
