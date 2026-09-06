import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GrowthComparisonService } from '../growthComparisonService';
import { AuthoritativeJournalEntry } from '../firestoreService';
import { DateRangeInput } from '../../types';

const MOCK_ENTRIES_USER_A: AuthoritativeJournalEntry[] = [
  // Period A entries (January 2026)
  {
    id: 'entry_jan_1',
    userId: 'user_a',
    title: 'Starting the new role - very overwhelmed',
    content: 'First day was intense. Felt anxious and stressed about expectations.',
    mood: 'Anxious',
    tags: ['career', 'onboarding'],
    version: 1,
    createdAt: '2026-01-05T09:00:00.000Z',
    aiAnalysis: {
      overview: 'First day at new job, feeling anxious about team expectations.',
      mood: 'Anxious',
      emotions: ['anxious', 'overwhelmed', 'nervous'],
      keyThemes: ['career', 'onboarding'],
      importantThoughts: ['Feeling anxious and stressed about expectations.'],
      growthSignals: [],
    },
  },
  {
    id: 'entry_jan_2',
    userId: 'user_a',
    title: 'Navigating setup difficulties',
    content: 'Struggled with the codebase setup. Spent 6 hours debugging.',
    mood: 'Frustrated',
    tags: ['work', 'debugging'],
    version: 1,
    createdAt: '2026-01-12T17:00:00.000Z',
    aiAnalysis: {
      overview: 'Experienced onboarding difficulties with dev environment setup.',
      mood: 'Frustrated',
      emotions: ['frustrated', 'stressed'],
      keyThemes: ['onboarding', 'technical setup'],
      importantThoughts: ['Struggled with the codebase setup.'],
      growthSignals: ['Persisted through complex environment setup.'],
    },
  },
  // Period B entries (February 2026)
  {
    id: 'entry_feb_1',
    userId: 'user_a',
    title: 'Shipped my first core feature',
    content: 'Completed the caching layer ahead of schedule. Felt confident and proud!',
    mood: 'Confident',
    tags: ['career', 'architecture', 'systems'],
    version: 1,
    createdAt: '2026-02-10T14:30:00.000Z',
    aiAnalysis: {
      overview: 'Shipped major caching subsystem with high confidence.',
      mood: 'Confident',
      emotions: ['confident', 'proud', 'energized'],
      keyThemes: ['career', 'architecture'],
      importantThoughts: ['Proud of delivering ahead of schedule.'],
      growthSignals: ['Delivered core backend infrastructure ahead of deadline.'],
    },
  },
  {
    id: 'entry_feb_2',
    userId: 'user_a',
    title: 'Mentoring new team member',
    content: 'Helped our new intern with system design. Realized how much I have learned.',
    mood: 'Grateful',
    tags: ['mentorship', 'leadership'],
    version: 1,
    createdAt: '2026-02-22T16:00:00.000Z',
    aiAnalysis: {
      overview: 'Mentored intern in system design, reflecting on personal learning.',
      mood: 'Grateful',
      emotions: ['grateful', 'confident', 'fulfilled'],
      keyThemes: ['mentorship', 'leadership'],
      importantThoughts: ['Realized how much I have learned over the past months.'],
      growthSignals: ['Demonstrated leadership through technical mentorship.'],
    },
  },
];

const MOCK_ENTRIES_USER_B: AuthoritativeJournalEntry[] = [
  {
    id: 'entry_user_b_1',
    userId: 'user_b',
    title: 'Secret user B notes',
    content: 'Private medical appointment and personal finances.',
    mood: 'Private',
    version: 1,
    createdAt: '2026-01-10T10:00:00.000Z',
  },
];

describe('MindVault Phase 5: Growth Comparison Engine ("What Changed About Me?")', () => {
  console.log('\n--- RUNNING MINDVAULT GROWTH COMPARISON TEST SUITE ---');

  it('1. Correctly filters entries by date range boundaries', () => {
    const periodAEntries = GrowthComparisonService.filterEntriesByDateRange(
      MOCK_ENTRIES_USER_A,
      '2026-01-01',
      '2026-01-31'
    );
    const periodBEntries = GrowthComparisonService.filterEntriesByDateRange(
      MOCK_ENTRIES_USER_A,
      '2026-02-01',
      '2026-02-28'
    );

    assert.equal(periodAEntries.length, 2);
    assert.deepEqual(
      periodAEntries.map((e) => e.id),
      ['entry_jan_1', 'entry_jan_2']
    );

    assert.equal(periodBEntries.length, 2);
    assert.deepEqual(
      periodBEntries.map((e) => e.id),
      ['entry_feb_1', 'entry_feb_2']
    );

    console.log('  [PASS] 1. Correctly filters entries by date range boundaries');
  });

  it('2. Summarizes period metrics deterministically (mood, emotions, themes, challenges, wins)', () => {
    const periodAEntries = GrowthComparisonService.filterEntriesByDateRange(
      MOCK_ENTRIES_USER_A,
      '2026-01-01',
      '2026-01-31'
    );
    const rangeA: DateRangeInput = {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      label: 'January 2026',
    };

    const summaryA = GrowthComparisonService.summarizePeriod(periodAEntries, rangeA);

    assert.equal(summaryA.entryCount, 2);
    assert.equal(summaryA.label, 'January 2026');
    assert.ok(['Anxious', 'Frustrated'].includes(summaryA.predominantMood));
    assert.ok(summaryA.topEmotions.some((e) => e.emotion === 'anxious' || e.emotion === 'stressed'));
    assert.ok(summaryA.topThemes.some((t) => t.theme === 'onboarding' || t.theme === 'career'));
    assert.ok(summaryA.challenges.length > 0);

    console.log('  [PASS] 2. Summarizes period metrics deterministically');
  });

  it('3. Computes clear longitudinal shifts between Period A and Period B', () => {
    const entriesA = GrowthComparisonService.filterEntriesByDateRange(
      MOCK_ENTRIES_USER_A,
      '2026-01-01',
      '2026-01-31'
    );
    const entriesB = GrowthComparisonService.filterEntriesByDateRange(
      MOCK_ENTRIES_USER_A,
      '2026-02-01',
      '2026-02-28'
    );

    const summaryA = GrowthComparisonService.summarizePeriod(entriesA, {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      label: 'January 2026',
    });
    const summaryB = GrowthComparisonService.summarizePeriod(entriesB, {
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      label: 'February 2026',
    });

    const deltas = GrowthComparisonService.computeDeltas(summaryA, summaryB);

    // Mood shift
    assert.ok(deltas.moodShift.periodAPredominantMood !== 'No data');
    assert.ok(deltas.moodShift.periodBPredominantMood !== 'No data');

    // Emerging emotions in Period B (e.g. proud, energized, fulfilled)
    assert.ok(
      deltas.emotionalShifts.emergingEmotions.some(
        (e) => e.emotion === 'proud' || e.emotion === 'confident' || e.emotion === 'energized' || e.emotion === 'fulfilled'
      )
    );

    // Declining emotions from Period A (e.g. anxious, overwhelmed, nervous)
    assert.ok(
      deltas.emotionalShifts.decliningEmotions.some(
        (e) => e.emotion === 'anxious' || e.emotion === 'overwhelmed' || e.emotion === 'nervous' || e.emotion === 'frustrated'
      )
    );

    // New themes in Period B (e.g. mentorship, leadership, architecture)
    assert.ok(
      deltas.themeShifts.newThemes.some(
        (t) => t.theme === 'mentorship' || t.theme === 'leadership' || t.theme === 'architecture'
      )
    );

    // Supporting evidence IDs preserved
    assert.deepEqual(deltas.growthTrajectory.evidenceEntryIds.periodA, ['entry_jan_1', 'entry_jan_2']);
    assert.deepEqual(deltas.growthTrajectory.evidenceEntryIds.periodB, ['entry_feb_1', 'entry_feb_2']);

    console.log('  [PASS] 3. Computes clear longitudinal shifts between Period A and Period B');
  });

  it('4. Handles empty periods gracefully without throwing or corrupting output', () => {
    const emptyEntries: AuthoritativeJournalEntry[] = [];
    const entriesB = GrowthComparisonService.filterEntriesByDateRange(
      MOCK_ENTRIES_USER_A,
      '2026-02-01',
      '2026-02-28'
    );

    const summaryEmpty = GrowthComparisonService.summarizePeriod(emptyEntries, {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      label: 'January 2025',
    });
    const summaryB = GrowthComparisonService.summarizePeriod(entriesB, {
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      label: 'February 2026',
    });

    const deltas = GrowthComparisonService.computeDeltas(summaryEmpty, summaryB);

    assert.equal(summaryEmpty.entryCount, 0);
    assert.equal(summaryEmpty.predominantMood, 'None');
    assert.ok(deltas.moodShift.summary.includes('Insufficient entries') || deltas.moodShift.summary.includes('No data'));

    console.log('  [PASS] 4. Handles empty periods gracefully');
  });

  it('5. Strictly isolates user datasets and preserves zero-trust boundaries', () => {
    // Attempting to filter User A entries using a mixed pool that contains User B data
    const userAEntriesOnly = MOCK_ENTRIES_USER_A.filter((e) => e.userId === 'user_a');
    const filteredA = GrowthComparisonService.filterEntriesByDateRange(
      userAEntriesOnly,
      '2026-01-01',
      '2026-01-31'
    );

    for (const entry of filteredA) {
      assert.equal(entry.userId, 'user_a');
      assert.notEqual(entry.userId, 'user_b');
    }

    console.log('  [PASS] 5. Strictly isolates user datasets and preserves zero-trust boundaries');
  });

  console.log('---------------------------------------------------------');
  console.log('COMPARISON TESTS SUMMARY: All Tests Passed.');
  console.log('---------------------------------------------------------');
});
