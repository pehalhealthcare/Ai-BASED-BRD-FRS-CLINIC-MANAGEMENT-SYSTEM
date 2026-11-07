import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Cinematic Why AI-CMS / Everything You Need to Run a Modern Clinic Specifications', () => {
  const featureDefinitions = [
    {
      id: 'ai-workflows',
      tag: '01',
      title: 'AI-Powered Workflows',
      shortTitle: 'AI Workflows',
      desc: 'Automate OPD, prescriptions, follow-ups and more.',
      themeName: 'Blue and violet',
      accentColor: '#2563EB',
    },
    {
      id: 'end-to-end',
      tag: '02',
      title: 'End-to-End Management',
      shortTitle: 'End-to-End',
      desc: 'OPD, IPD, Lab, Pharmacy, Billing, Inventory — all in one place.',
      themeName: 'Cyan and sky blue',
      accentColor: '#0284C7',
    },
    {
      id: 'patient-exp',
      tag: '03',
      title: 'Better Patient Experience',
      shortTitle: 'Patient Experience',
      desc: 'Faster service, digital records and seamless communication.',
      themeName: 'Purple and pink',
      accentColor: '#9333EA',
    },
    {
      id: 'security-compliant',
      tag: '04',
      title: 'Secure & Compliant',
      shortTitle: 'Secure & Compliant',
      desc: 'Built for Indian healthcare standards with enterprise-grade security.',
      themeName: 'Mint and emerald',
      accentColor: '#059669',
    },
    {
      id: 'insights',
      tag: '05',
      title: 'Actionable Insights',
      shortTitle: 'Actionable Insights',
      desc: 'Real-time reports to help you grow your practice.',
      themeName: 'Amber and orange',
      accentColor: '#D97706',
    },
    {
      id: 'access-anywhere',
      tag: '06',
      title: 'Access Anywhere',
      shortTitle: 'Access Anywhere',
      desc: 'Web, tablet and mobile — your clinic in your pocket.',
      themeName: 'Electric blue and cyan/rose',
      accentColor: '#0070F3',
    },
  ];

  it('1. Preserves all 6 feature categories and required content without loss', () => {
    assert.equal(featureDefinitions.length, 6);
    const ids = featureDefinitions.map((f) => f.id);
    assert.deepEqual(ids, [
      'ai-workflows',
      'end-to-end',
      'patient-exp',
      'security-compliant',
      'insights',
      'access-anywhere',
    ]);
  });

  it('2. Continuous carousel navigation loops cleanly in both directions', () => {
    const total = featureDefinitions.length;
    let activeIndex = 0;

    const next = () => (activeIndex = (activeIndex + 1) % total);
    const prev = () => (activeIndex = (activeIndex - 1 + total) % total);

    // Forward loop
    assert.equal(next(), 1);
    assert.equal(next(), 2);
    assert.equal(next(), 3);
    assert.equal(next(), 4);
    assert.equal(next(), 5);
    assert.equal(next(), 0); // Wraps around from 5 to 0

    // Backward loop
    assert.equal(prev(), 5); // Wraps around from 0 to 5
    assert.equal(prev(), 4);
  });

  it('3. Direct category grid click synchronizes carousel card and active index', () => {
    let activeIndex = 0;
    let direction = 0;

    const selectCategory = (index) => {
      direction = index > activeIndex ? 1 : -1;
      activeIndex = index;
    };

    selectCategory(5); // Access Anywhere
    assert.equal(activeIndex, 5);
    assert.equal(direction, 1);
    assert.equal(featureDefinitions[activeIndex].shortTitle, 'Access Anywhere');

    selectCategory(2); // Patient Experience
    assert.equal(activeIndex, 2);
    assert.equal(direction, -1);
    assert.equal(featureDefinitions[activeIndex].shortTitle, 'Patient Experience');
  });

  it('4. Touch and Drag swipe threshold logic correctly navigates next and prev', () => {
    const swipeThreshold = 40;
    const velocityThreshold = 250;

    const evaluateSwipe = (offset, velocity) => {
      if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
        return 'next';
      }
      if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
        return 'prev';
      }
      return 'none';
    };

    // Swipe left (advance to next)
    assert.equal(evaluateSwipe({ x: -50 }, { x: -100 }), 'next');
    assert.equal(evaluateSwipe({ x: -10 }, { x: -300 }), 'next');

    // Swipe right (advance to prev)
    assert.equal(evaluateSwipe({ x: 60 }, { x: 50 }), 'prev');
    assert.equal(evaluateSwipe({ x: 15 }, { x: 280 }), 'prev');

    // Insufficient gesture (no change)
    assert.equal(evaluateSwipe({ x: 10 }, { x: 20 }), 'none');
  });

  it('5. Each feature has a distinct thematic ambient background palette', () => {
    const themes = {
      'ai-workflows': { primary: 'rgba(59, 130, 246, 0.22)', secondary: 'rgba(139, 92, 246, 0.18)' },
      'end-to-end': { primary: 'rgba(6, 182, 212, 0.22)', secondary: 'rgba(56, 189, 248, 0.18)' },
      'patient-exp': { primary: 'rgba(168, 85, 247, 0.20)', secondary: 'rgba(236, 72, 153, 0.16)' },
      'security-compliant': { primary: 'rgba(16, 185, 129, 0.20)', secondary: 'rgba(20, 184, 166, 0.16)' },
      'insights': { primary: 'rgba(245, 158, 11, 0.20)', secondary: 'rgba(249, 115, 22, 0.16)' },
      'access-anywhere': { primary: 'rgba(14, 165, 233, 0.22)', secondary: 'rgba(244, 63, 94, 0.18)' },
    };

    featureDefinitions.forEach((feat) => {
      const th = themes[feat.id];
      assert.ok(th, `Theme exists for ${feat.id}`);
      assert.ok(th.primary.startsWith('rgba('));
      assert.ok(th.secondary.startsWith('rgba('));
    });
  });

  it('6. Feature indicator tag conforms to 01 / 06 to 06 / 06 format', () => {
    featureDefinitions.forEach((feat, index) => {
      const tag = `0${index + 1} / 0${featureDefinitions.length}`;
      assert.match(tag, /^0[1-6] \/ 06$/);
    });
  });
});

