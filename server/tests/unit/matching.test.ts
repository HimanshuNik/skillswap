import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMatchScore, type MatchUserContext } from '../../src/services/matching.service.js';

describe('Two-Way Matching Algorithm Unit Tests', () => {
  const userA: MatchUserContext = {
    id: 1,
    name: 'Alice',
    username: 'alice',
    location: 'New York, USA',
    bio: 'Software engineer',
    avatarUrl: null,
    timezone: 'America/New_York',
    averageRating: 4.8,
    totalReviews: 10,
    completedSessions: 12,
    teachingSkills: [{ id: 1, name: 'React', category: 'Development' }],
    learningSkills: [{ id: 2, name: 'UI/UX Design', category: 'Design' }],
    availability: [
      { day: 'Monday', slots: ['Morning', 'Evening'] },
      { day: 'Wednesday', slots: ['Morning'] },
    ],
  };

  const userB: MatchUserContext = {
    id: 2,
    name: 'Bob',
    username: 'bob',
    location: 'London, UK',
    bio: 'Product designer',
    avatarUrl: null,
    timezone: 'Europe/London',
    averageRating: 5.0,
    totalReviews: 8,
    completedSessions: 9,
    teachingSkills: [{ id: 2, name: 'UI/UX Design', category: 'Design' }],
    learningSkills: [{ id: 1, name: 'React', category: 'Development' }],
    availability: [
      { day: 'Monday', slots: ['Morning'] },
      { day: 'Friday', slots: ['Evening'] },
    ],
  };

  test('1. Reciprocal match returns high compatibility (> 80%) with explainable breakdown', () => {
    const match = calculateMatchScore(userA, userB);
    assert.ok(match);
    assert.equal(match.isReciprocal, true);
    assert.deepEqual(match.theyCanTeachYou, ['UI/UX Design']);
    assert.deepEqual(match.youCanTeachThem, ['React']);
    assert.ok(match.compatibilityScore >= 80, `Expected score >= 80, got ${match.compatibilityScore}`);
    assert.ok(match.explanation.includes('Excellent two-way match'));
    assert.ok(match.explanation.includes('Monday'));
  });

  test('2. One-way match is strictly capped at 30%', () => {
    // User C wants React from Alice, but teaches French which Alice does not want
    const userC: MatchUserContext = {
      id: 3,
      name: 'Charlie',
      username: 'charlie',
      location: 'Paris, France',
      bio: 'French teacher',
      avatarUrl: null,
      timezone: 'Europe/Paris',
      averageRating: 5.0,
      totalReviews: 20,
      completedSessions: 25,
      teachingSkills: [{ id: 3, name: 'French', category: 'Languages' }],
      learningSkills: [{ id: 1, name: 'React', category: 'Development' }],
      availability: [{ day: 'Monday', slots: ['Morning'] }],
    };

    const match = calculateMatchScore(userA, userC);
    assert.ok(match);
    assert.equal(match.isReciprocal, false);
    assert.ok(match.compatibilityScore <= 30, `Expected non-reciprocal score <= 30, got ${match.compatibilityScore}`);
    assert.ok(match.explanation.includes('One-way match'));
  });

  test('3. Multiple reciprocal skills increase compatibility score', () => {
    const userA_multi: MatchUserContext = {
      ...userA,
      teachingSkills: [
        { id: 1, name: 'React', category: 'Development' },
        { id: 4, name: 'TypeScript', category: 'Development' },
      ],
      learningSkills: [
        { id: 2, name: 'UI/UX Design', category: 'Design' },
        { id: 5, name: 'Figma', category: 'Design' },
      ],
    };

    const userB_multi: MatchUserContext = {
      ...userB,
      teachingSkills: [
        { id: 2, name: 'UI/UX Design', category: 'Design' },
        { id: 5, name: 'Figma', category: 'Design' },
      ],
      learningSkills: [
        { id: 1, name: 'React', category: 'Development' },
        { id: 4, name: 'TypeScript', category: 'Development' },
      ],
    };

    const singleMatch = calculateMatchScore(userA, userB)!;
    const multiMatch = calculateMatchScore(userA_multi, userB_multi)!;

    assert.ok(multiMatch.compatibilityScore >= singleMatch.compatibilityScore);
    assert.equal(multiMatch.theyCanTeachYou.length, 2);
    assert.equal(multiMatch.youCanTeachThem.length, 2);
    assert.equal(multiMatch.skillCompatibility, 100);
  });

  test('4. Neutral reputation baseline (70/100) used for users with zero reviews', () => {
    const userNew: MatchUserContext = {
      ...userB,
      totalReviews: 0,
      averageRating: 0,
    };

    const match = calculateMatchScore(userA, userNew);
    assert.ok(match);
    assert.equal(match.reputationScore, 70);
  });

  test('5. Missing availability is handled gracefully with neutral baseline (50/100)', () => {
    const userNoAvail: MatchUserContext = {
      ...userB,
      availability: [],
    };

    const match = calculateMatchScore(userA, userNoAvail);
    assert.ok(match);
    assert.equal(match.availabilityMatch, 50);
  });

  test('6. Matching against self returns null', () => {
    const match = calculateMatchScore(userA, userA);
    assert.equal(match, null);
  });

  test('7. Completely unrelated skills return null', () => {
    const userUnrelated: MatchUserContext = {
      id: 99,
      name: 'Zara',
      username: 'zara',
      location: 'Rome',
      bio: '',
      avatarUrl: null,
      timezone: 'UTC',
      averageRating: 5.0,
      totalReviews: 5,
      completedSessions: 5,
      teachingSkills: [{ id: 9, name: 'Guitar', category: 'Creative' }],
      learningSkills: [{ id: 10, name: 'Italian', category: 'Languages' }],
      availability: [],
    };

    const match = calculateMatchScore(userA, userUnrelated);
    assert.equal(match, null);
  });
});

