import { describe, it, expect, vi } from 'vitest';
import { selectWordsForMode } from '../game';

describe('selectWordsForMode', () => {
    const wordList = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];

    describe('CLASSIC mode', () => {
        it('should return only citizenWord', () => {
            // Mock random to return first word
            const mockRandom = vi.fn().mockReturnValue(0);

            const result = selectWordsForMode('CLASSIC', wordList, mockRandom);

            expect(result.citizenWord).toBe('Apple');
            expect(result.imposterWord).toBeUndefined();
            expect(mockRandom).toHaveBeenCalledTimes(1);
        });

        it('should select word based on random index', () => {
            // Mock random to return 0.5 (index 2 for 5 items)
            const mockRandom = vi.fn().mockReturnValue(0.5);

            const result = selectWordsForMode('CLASSIC', wordList, mockRandom);

            expect(result.citizenWord).toBe('Cherry');
            expect(result.imposterWord).toBeUndefined();
        });
    });

    describe('BLIND mode', () => {
        it('should return both citizenWord and imposterWord', () => {
            // First call for citizenWord (index 0), second for imposterWord (index 1)
            const mockRandom = vi.fn()
                .mockReturnValueOnce(0)      // citizenIndex = 0 -> Apple
                .mockReturnValueOnce(0.25);  // imposterIndex = 1 -> Banana

            const result = selectWordsForMode('BLIND', wordList, mockRandom);

            expect(result.citizenWord).toBe('Apple');
            expect(result.imposterWord).toBe('Banana');
        });

        it('should ensure imposterWord is different from citizenWord', () => {
            // First return same index, then different
            const mockRandom = vi.fn()
                .mockReturnValueOnce(0)    // citizenIndex = 0
                .mockReturnValueOnce(0)    // imposterIndex = 0 (same, should retry)
                .mockReturnValueOnce(0.4); // imposterIndex = 2 (different)

            const result = selectWordsForMode('BLIND', wordList, mockRandom);

            expect(result.citizenWord).toBe('Apple');
            expect(result.imposterWord).toBe('Cherry');
            expect(mockRandom).toHaveBeenCalledTimes(3); // Retried once
        });

        it('should handle single word list', () => {
            const singleWordList = ['OnlyWord'];
            const mockRandom = vi.fn().mockReturnValue(0);

            const result = selectWordsForMode('BLIND', singleWordList, mockRandom);

            expect(result.citizenWord).toBe('OnlyWord');
            expect(result.imposterWord).toBe('OnlyWord');
        });

        it('should handle two word list', () => {
            const twoWordList = ['First', 'Second'];
            const mockRandom = vi.fn()
                .mockReturnValueOnce(0)    // citizenIndex = 0
                .mockReturnValueOnce(0.6); // imposterIndex = 1

            const result = selectWordsForMode('BLIND', twoWordList, mockRandom);

            expect(result.citizenWord).toBe('First');
            expect(result.imposterWord).toBe('Second');
        });
    });
});

import { selectTurnOrder } from '../game';

describe('selectTurnOrder', () => {
    const players = ['imposter', 'citizen1', 'citizen2'];
    const imposterId = 'imposter';

    describe('CLASSIC mode - weighted (same as BLIND)', () => {
        it('should apply weighted selection for first speaker', () => {
            // random = 0.3 → 0.3 * 2.5 = 0.75
            // Weights: imposter=0.5, c1=1.0, c2=1.0 (total=2.5)
            // 0.75 - 0.5 = 0.25 > 0 → NOT imposter
            const mockRandom = vi.fn().mockReturnValue(0.3);

            const result = selectTurnOrder(players, imposterId, 'CLASSIC', mockRandom);

            // CLASSIC now uses weighted selection like BLIND
            expect(result[0]).toBe('citizen1');
            expect(result).toContain('imposter');
        });

        it('should still allow imposter to be first with low random', () => {
            // random = 0.1 → 0.1 * 2.5 = 0.25
            // 0.25 - 0.5 < 0 → imposter selected
            const mockRandom = vi.fn().mockReturnValue(0.1);

            const result = selectTurnOrder(players, imposterId, 'CLASSIC', mockRandom);

            expect(result[0]).toBe('imposter');
        });
    });

    describe('BLIND mode - weighted first speaker', () => {
        it('should reduce imposter first speaker probability', () => {
            // random = 0.3 → 0.3 * 2.5 = 0.75
            // Weights: imposter=0.5, c1=1.0, c2=1.0 (total=2.5)
            // 0.75 - 0.5 = 0.25 > 0 → NOT imposter
            // 0.25 - 1.0 < 0 → citizen1 selected
            const mockRandom = vi.fn().mockReturnValue(0.3);

            const result = selectTurnOrder(players, imposterId, 'BLIND', mockRandom);

            expect(result[0]).toBe('citizen1');
            expect(result).toContain('imposter');
        });

        it('should still allow imposter to be first with very low random', () => {
            // random = 0.1 → 0.1 * 2.5 = 0.25
            // 0.25 - 0.5 < 0 → imposter selected
            const mockRandom = vi.fn().mockReturnValue(0.1);

            const result = selectTurnOrder(players, imposterId, 'BLIND', mockRandom);

            expect(result[0]).toBe('imposter');
        });

        it('should have same behavior as CLASSIC (both weighted)', () => {
            // Same random value, same behavior
            const mockRandom1 = vi.fn().mockReturnValue(0.3);
            const mockRandom2 = vi.fn().mockReturnValue(0.3);

            const classicResult = selectTurnOrder(players, imposterId, 'CLASSIC', mockRandom1);
            const blindResult = selectTurnOrder(players, imposterId, 'BLIND', mockRandom2);

            // Both modes now have same weighted behavior
            expect(classicResult[0]).toBe(blindResult[0]);
        });
    });
});
