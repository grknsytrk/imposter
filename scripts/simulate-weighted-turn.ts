/**
 * Simülasyon: Weighted Turn Order Doğrulama
 * 
 * Bu script TEST DEĞİLDİR. Internal sanity check'tir.
 * Test suite'e dahil edilmez.
 * 
 * Çalıştırmak için:
 *   npx tsx scripts/simulate-weighted-turn.ts
 * 
 * Not: 100k iterasyon ≈ ±0.3% hata payı
 */

type GameMode = 'CLASSIC' | 'BLIND';

const IMPOSTER_FIRST_SPEAKER_WEIGHTS: Record<GameMode, number> = {
    CLASSIC: 0.5,
    BLIND: 0.5,
};

function getImposterFirstSpeakerWeight(mode: GameMode): number {
    return IMPOSTER_FIRST_SPEAKER_WEIGHTS[mode] ?? 1.0;
}

function selectTurnOrder(
    playerIds: string[],
    imposterId: string,
    mode: GameMode
): string[] {
    const imposterWeight = getImposterFirstSpeakerWeight(mode);

    const weights = playerIds.map(id => ({
        id,
        weight: id === imposterId ? imposterWeight : 1.0
    }));

    const result: string[] = [];
    const remaining = [...weights];

    // İlk konuşmacı: Weighted selection
    const totalWeight = remaining.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < remaining.length; i++) {
        random -= remaining[i].weight;
        if (random <= 0) {
            result.push(remaining[i].id);
            remaining.splice(i, 1);
            break;
        }
    }

    // Kalan oyuncular
    const shuffledRest = remaining.map(w => w.id).sort(() => Math.random() - 0.5);
    result.push(...shuffledRest);

    return result;
}

// Simülasyon
function simulate(playerCount: number, iterations: number = 100000) {
    let imposterFirst = 0;
    const citizenFirstCounts: number[] = Array(playerCount - 1).fill(0);

    for (let i = 0; i < iterations; i++) {
        const players = Array.from({ length: playerCount }, (_, i) => `p${i}`);
        const imposterId = players[0]; // p0 = imposter
        const result = selectTurnOrder(players, imposterId, 'CLASSIC');

        if (result[0] === imposterId) {
            imposterFirst++;
        } else {
            // Hangi citizen ilk?
            const citizenIndex = parseInt(result[0].slice(1)) - 1; // p1->0, p2->1, etc
            citizenFirstCounts[citizenIndex]++;
        }
    }

    return {
        imposter: (imposterFirst / iterations) * 100,
        // Herhangi BİR citizen'ın ilk olma olasılığı (hepsi eşit)
        citizenEach: (citizenFirstCounts[0] / iterations) * 100
    };
}

// Sonuçları yazdır
console.log('\n📊 Weighted Turn Order Simülasyonu (100,000 iterasyon)\n');
console.log('| Kişi | Imposter Beklenen | Imposter Gerçek | Citizen(her biri) Beklenen | Citizen Gerçek |');
console.log('|------|-------------------|-----------------|---------------------------|----------------|');

for (let n = 3; n <= 8; n++) {
    const totalWeight = 0.5 + (n - 1);
    const expectedImposter = (0.5 / totalWeight) * 100;
    const expectedCitizenEach = (1.0 / totalWeight) * 100;

    const result = simulate(n);

    console.log(`| ${n}    | ${expectedImposter.toFixed(2).padStart(15)}% | ${result.imposter.toFixed(2).padStart(13)}% | ${expectedCitizenEach.toFixed(2).padStart(25)}% | ${result.citizenEach.toFixed(2).padStart(12)}% |`);
}

console.log('\n✅ Simülasyon tamamlandı.\n');
