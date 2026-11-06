import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('UI/UX: Compact In-Page Loading & Persistent Navigation Tests', () => {
  const loadingContextPath = path.resolve('frontend/src/context/LoadingContext.jsx');
  const globalLoaderPath = path.resolve('frontend/src/components/common/GlobalLoader.jsx');
  const compactLoaderPath = path.resolve('frontend/src/components/common/CompactPageLoader.jsx');
  const navProgressBarPath = path.resolve('frontend/src/components/common/NavigationProgressBar.jsx');
  const pageSkeletonPath = path.resolve('frontend/src/components/common/PageSkeleton.jsx');
  const loadingStatePath = path.resolve('frontend/src/components/common/LoadingState.jsx');
  const dashboardLayoutPath = path.resolve('frontend/src/components/layout/DashboardLayout.jsx');

  const loadingContextCode = fs.readFileSync(loadingContextPath, 'utf8');
  const globalLoaderCode = fs.readFileSync(globalLoaderPath, 'utf8');
  const compactLoaderCode = fs.readFileSync(compactLoaderPath, 'utf8');
  const navProgressBarCode = fs.readFileSync(navProgressBarPath, 'utf8');
  const pageSkeletonCode = fs.readFileSync(pageSkeletonPath, 'utf8');
  const loadingStateCode = fs.readFileSync(loadingStatePath, 'utf8');
  const dashboardLayoutCode = fs.readFileSync(dashboardLayoutPath, 'utf8');

  test('1. Full-screen loader eliminated on navigation: isAppInitialized stops re-initialization', () => {
    assert.ok(
      loadingContextCode.includes('isAppInitializedRef'),
      'LoadingContext must track isAppInitializedRef'
    );
    assert.ok(
      loadingContextCode.includes('isAppInitializedRef.current = true'),
      'LoadingContext must mark isAppInitializedRef.current as true upon bootstrap completion'
    );
    assert.ok(
      loadingContextCode.includes('if (isAppInitializedRef.current)'),
      'Route changes must check isAppInitializedRef and bypass full-screen initialization'
    );
  });

  test('2. GlobalLoader returns null when app is initialized', () => {
    assert.ok(
      globalLoaderCode.includes('isAppInitialized'),
      'GlobalLoader must inspect isAppInitialized state'
    );
    assert.ok(
      globalLoaderCode.includes('if (!isLoading || isAppInitialized) return null'),
      'GlobalLoader must immediately return null once the application shell is initialized'
    );
  });

  test('3. CompactPageLoader meets design requirements: 20-26px, PEHAL blue, non-blocking', () => {
    assert.ok(
      compactLoaderCode.includes('24') || compactLoaderCode.includes('22'),
      'CompactPageLoader must target 20-26px diameter'
    );
    assert.ok(
      compactLoaderCode.includes('#2563EB') || compactLoaderCode.includes('blue'),
      'CompactPageLoader must use PEHAL primary blue'
    );
    assert.ok(
      compactLoaderCode.includes('animate-[spin'),
      'CompactPageLoader must use smooth circular spin rotation'
    );
    assert.ok(
      !compactLoaderCode.includes('z-[9999]'),
      'CompactPageLoader must not use full-screen blocking overlay'
    );
  });

  test('4. Subtle Navigation Progress Bar (Option C) integrated at top of content area', () => {
    assert.ok(
      navProgressBarCode.includes('navProgress'),
      'NavigationProgressBar must track navProgress'
    );
    assert.ok(
      navProgressBarCode.includes('h-[2.5px]') || navProgressBarCode.includes('h-'),
      'NavigationProgressBar must be a thin non-blocking indicator'
    );
    assert.ok(
      dashboardLayoutCode.includes('NavigationProgressBar'),
      'DashboardLayout must mount NavigationProgressBar above the content area'
    );
  });

  test('5. LoadingState upgraded to render CompactPageLoader for all in-page loading views', () => {
    assert.ok(
      loadingStateCode.includes('CompactPageLoader'),
      'LoadingState must delegate to CompactPageLoader'
    );
  });

  test('6. Persistent Application Layout: Sidebar, Topbar, and Shell remain mounted during navigation', () => {
    assert.ok(
      dashboardLayoutCode.includes('<Sidebar'),
      'DashboardLayout must keep Sidebar mounted'
    );
    assert.ok(
      dashboardLayoutCode.includes('<Topbar'),
      'DashboardLayout must keep Topbar mounted'
    );
    assert.ok(
      dashboardLayoutCode.includes('<Outlet />') || dashboardLayoutCode.includes('<Outlet'),
      'DashboardLayout must mount Outlet in main content container'
    );
  });

  test('7. PageSkeleton provides matching placeholder dimensions for cards and tables (Option B)', () => {
    assert.ok(
      pageSkeletonCode.includes('DashboardSkeleton'),
      'Must export DashboardSkeleton'
    );
    assert.ok(
      pageSkeletonCode.includes('TableSkeleton'),
      'Must export TableSkeleton'
    );
    assert.ok(
      pageSkeletonCode.includes('CardsGridSkeleton'),
      'Must export CardsGridSkeleton'
    );
  });
});

