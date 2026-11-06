import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Dashboard Header & Sidebar Layout Verification', () => {
  const topbarPath = path.resolve('frontend/src/components/layout/Topbar.jsx');
  const sidebarPath = path.resolve('frontend/src/components/layout/Sidebar.jsx');
  const layoutPath = path.resolve('frontend/src/components/layout/DashboardLayout.jsx');

  const topbarCode = fs.readFileSync(topbarPath, 'utf8');
  const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');

  it('1. Topbar: duplicate hamburger button is completely removed from header', () => {
    // Should NOT have button with onClick={onToggleSidebar} or aria-label="Toggle sidebar"
    assert.strictEqual(
      topbarCode.includes('aria-label="Toggle sidebar"'),
      false,
      'Topbar should not contain a sidebar toggle button'
    );
    assert.strictEqual(
      topbarCode.includes('<Menu size={18} />'),
      false,
      'Topbar should not render Menu hamburger icon'
    );
  });

  it('2. Topbar: preserves PEHAL branding and AI-CMS Enterprise title', () => {
    assert.ok(
      topbarCode.includes('import pehalLogo'),
      'Topbar must import and preserve PEHAL logo'
    );
    assert.ok(
      topbarCode.includes('AICMS'),
      'Topbar must contain AICMS branding'
    );
    assert.ok(
      topbarCode.includes('AI-CMS Enterprise'),
      'Topbar must preserve AI-CMS Enterprise subtitle'
    );
  });

  it('3. Sidebar: PEHAL logo is completely removed from all sidebar states', () => {
    assert.strictEqual(
      sidebarCode.includes('import pehalLogo'),
      false,
      'Sidebar must not import pehalLogo'
    );
    assert.strictEqual(
      sidebarCode.includes('pehalLogo'),
      false,
      'Sidebar must not contain any reference to pehalLogo'
    );
  });

  it('4. Sidebar: has the single hamburger button at the top that handles collapse/expand', () => {
    assert.ok(
      sidebarCode.includes('handleToggle'),
      'Sidebar must define handleToggle for the top hamburger button'
    );
    assert.ok(
      sidebarCode.includes('<Menu size={22} />'),
      'Sidebar must render the top hamburger button with Menu icon'
    );
  });

  it('5. DashboardLayout: wires toggleSidebar to Sidebar onToggleSidebar', () => {
    assert.ok(
      layoutCode.includes('onToggleSidebar={toggleSidebar}'),
      'DashboardLayout must wire onToggleSidebar to Sidebar'
    );
  });
});

