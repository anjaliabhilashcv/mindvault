import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GrowthService } from '../growthService';
import { AuthoritativeJournalEntry } from '../firestoreService';

const USER_A_ENTRIES: AuthoritativeJournalEntry[] = [
  {
    id: 'entry_1',
    userId: 'user_a',
    title: 'First week at new job',
    content: 'Felt anxious on Monday, but by Thursday I felt confident with the codebase.',
    mood: 'Confident',
    tags: ['work', 'career'],
    version: 1,
    createdAt: '2026-03-01T10:00:00.000Z',
    aiAnalysis: {
      overview: 'Transitioned smoothly into new work environment.',
      mood: 'Confident',
      emotions: ['anxious', 'confident', 'curious'],
      keyThemes: ['career', 'onboarding'],
      growthSignals: ['Overcame initial anxiety quickly through codebase immersion.'],
    },
  },
  {
    id: 'entry_2',
    userId: 'user_a',
    title: 'Building side project',
    content: 'Made great progress on the compiler project today. Excited about performance!',
    mood: 'Excited',
    tags: ['coding', 'systems'],
    version: 1,
    createdAt: '2026-03-03T18:00:00.000Z',
    aiAnalysis: {
      overview: 'Completed major compiler optimization milestone.',
      mood: 'Excited',
      emotions: ['excited', 'driven'],
      keyThemes: ['coding', 'learning'],
      growthSignals: ['Achieved deep focus and technical mastery in compiler optimizations.'],
    },
  },
  {
    id: 'entry_3',
    userId: 'user_a',
    title: 'Weekend run and reflection',
    content: 'Ran 10k in the rain. Mentally refreshing and grateful.',
    mood: 'Grateful',
    tags: ['fitness', 'health'],
    version: 1,
    createdAt: '2026-03-05T08:30:00.000Z',
    aiAnalysis: {
      overview: 'Completed 10k run and practiced gratitude.',
      mood: 'Grateful',
      emotions: ['grateful', 'calm'],
      keyThemes: ['fitness', 'mindfulness'],
      growthSignals: ['Maintained fitness discipline in adverse weather conditions.'],
    },
  },
];

const USER_B_ENTRIES: AuthoritativeJournalEntry[] = [
  {
    id: 'entry_b_1',
    userId: 'user_b',
    title: 'Bob Secret Financial Log',
    content: 'Private mortgage calculation.',
    mood: 'Stressed',
    tags: ['finance'],
    version: 1,
    createdAt: '2026-03-02T12:00:00.000Z',
    aiAnalysis: {
      overview: 'Bob reviewed private financials.',
      mood: 'Stressed',
      emotions: ['overwhelmed'],
      keyThemes: ['finance'],
      growthSignals: ['Took control of financial planning.'],
    },
  },
];

console.log('--- RUNNING MINDVAULT GROWTH INTELLIGENCE TEST SUITE ---');

async function runGrowthTests() {
  let passed = 0;
  let failed = 0;

  function recordTest(name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        console.log(`  [PASS] ${name}`);
        passed++;
      } catch (err: unknown) {
        console.error(`  [FAIL] ${name}`);
        console.error('    Error:', err instanceof Error ? err.message : err);
        failed++;
      }
    })();
  }

  // TEST 1: Deterministic mood trend calculation
  await recordTest('1. Calculates deterministic mood trends chronologically', () => {
    const trends = GrowthService.computeMoodTrends(USER_A_ENTRIES);
    assert.equal(trends.length, 3);
    assert.equal(trends[0].date, '2026-03-01');
    assert.equal(trends[0].mood, 'Confident');
    assert.equal(trends[1].date, '2026-03-03');
    assert.equal(trends[1].mood, 'Excited');
    assert.equal(trends[2].date, '2026-03-05');
    assert.equal(trends[2].mood, 'Grateful');
  });

  // TEST 2: Deterministic emotion aggregation
  await recordTest('2. Aggregates recurring emotions with percentages', () => {
    const emotions = GrowthService.computeRecurringEmotions(USER_A_ENTRIES);
    assert.ok(emotions.length > 0);
    const emotionNames = emotions.map((e) => e.emotion);
    assert.ok(emotionNames.includes('confident'));
    assert.ok(emotionNames.includes('excited'));
    assert.ok(emotionNames.includes('grateful'));

    // Check sum of percentages approximately equals 100
    const totalPct = emotions.reduce((acc, curr) => acc + curr.percentage, 0);
    assert.ok(totalPct >= 90 && totalPct <= 110);
  });

  // TEST 3: Deterministic theme aggregation
  await recordTest('3. Aggregates recurring themes and correlates tags', () => {
    const themes = GrowthService.computeRecurringThemes(USER_A_ENTRIES);
    assert.ok(themes.length > 0);
    const themeNames = themes.map((t) => t.theme);
    assert.ok(themeNames.includes('career') || themeNames.includes('coding') || themeNames.includes('fitness'));
  });

  // TEST 4: Positive moments extraction
  await recordTest('4. Extracts positive moments and growth signals from user entries', () => {
    const wins = GrowthService.extractPositiveMoments(USER_A_ENTRIES);
    assert.ok(wins.length >= 3);
    assert.equal(wins[0].entryId, 'entry_1');
    assert.ok(wins[0].moment.includes('anxiety'));
  });

  // TEST 5: Strict Cross-User Isolation
  await recordTest('5. Growth intelligence calculations never mix data across user boundaries', () => {
    const userAInsights = GrowthService.computeRecurringThemes(USER_A_ENTRIES);
    const userBThemes = userAInsights.map((t) => t.theme);
    assert.ok(!userBThemes.includes('finance'), 'User B finance theme must NOT appear in User A insights');

    const userAWins = GrowthService.extractPositiveMoments(USER_A_ENTRIES);
    const userBWins = userAWins.filter((w) => w.entryId.startsWith('entry_b'));
    assert.equal(userBWins.length, 0, 'User B entries must never appear in User A wins');
  });

  console.log('\n---------------------------------------------------------');
  console.log(`GROWTH TESTS SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Total Tests.`);
  console.log('---------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGrowthTests();
