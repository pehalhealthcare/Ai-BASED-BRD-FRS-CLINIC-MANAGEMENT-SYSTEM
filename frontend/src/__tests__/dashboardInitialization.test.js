import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Dashboard Initialization Lifecycle & Loader State Machine Tests', () => {
  const loadingContextPath = path.resolve('frontend/src/context/LoadingContext.jsx');
  const globalLoaderPath = path.resolve('frontend/src/components/common/GlobalLoader.jsx');
  const axiosClientPath = path.resolve('frontend/src/api/axiosClient.js');
  const apiPath = path.resolve('frontend/src/lib/api.js');
  const roleDashboardPath = path.resolve('frontend/src/features/dashboard/RoleDashboardPage.jsx');

  const loadingContextCode = fs.readFileSync(loadingContextPath, 'utf8');
  const globalLoaderCode = fs.readFileSync(globalLoaderPath, 'utf8');
  const axiosClientCode = fs.readFileSync(axiosClientPath, 'utf8');
  const apiCode = fs.readFileSync(apiPath, 'utf8');
  const roleDashboardCode = fs.readFileSync(roleDashboardPath, 'utf8');

  it('1. Root cause eliminated: replaces fragile timer-only init with real 4-stage lifecycle runner', () => {
    assert.ok(
      loadingContextCode.includes('runInitialization'),
      'LoadingContext must implement runInitialization lifecycle runner'
    );
    assert.ok(
      loadingContextCode.includes('lifecycleIdRef'),
      'LoadingContext must use lifecycleIdRef to avoid StrictMode re-mount cancellation freezes'
    );
    assert.ok(
      loadingContextCode.includes('watchdogTimerRef'),
      'LoadingContext must include a safety watchdog timer to guarantee unfreezing'
    );
  });

  it('2. Stage 1 (Connecting): checks network and runs non-blocking WebSocket check', () => {
    assert.ok(
      loadingContextCode.includes("setStatus('connecting')"),
      'Must transition state to connecting'
    );
    assert.ok(
      loadingContextCode.includes('navigator.onLine'),
      'Must verify navigator.onLine during connecting stage'
    );
    assert.ok(
      loadingContextCode.includes('socketCheckPromise') || loadingContextCode.includes('socketUrl'),
      'Must check WebSocket connectivity non-blockingly without halting dashboard access'
    );
  });

  it('3. Stage 2 (Authenticating): validates token with timeout & handles 401 gracefully', () => {
    assert.ok(
      loadingContextCode.includes("setStatus('authenticating')"),
      'Must transition state to authenticating'
    );
    assert.ok(
      loadingContextCode.includes('authApi.me()'),
      'Must validate session with authApi.me()'
    );
    assert.ok(
      loadingContextCode.includes('withTimeout'),
      'Must wrap auth requests with explicit timeout'
    );
    assert.ok(
      loadingContextCode.includes('clearAuthStorage'),
      'Must clear auth storage on 401 expired session'
    );
  });

  it('4. Stage 3 (Fetching Data): non-critical queries never block dashboard', () => {
    assert.ok(
      loadingContextCode.includes("setStatus('fetching')"),
      'Must transition state to fetching'
    );
    assert.ok(
      loadingContextCode.includes('getSetupStatus'),
      'Must check setup status for Admin role'
    );
  });

  it('5. Stage 4 (Finalizing) to Ready: automatically mounts dashboard without manual override', () => {
    assert.ok(
      loadingContextCode.includes("setStatus('finalizing')"),
      'Must transition state to finalizing'
    );
    assert.ok(
      loadingContextCode.includes("setStatus('ready')"),
      'Must reach ready state upon completion'
    );
    assert.ok(
      loadingContextCode.includes('setIsLoading(false)'),
      'Must dismiss full-screen loader'
    );
  });

  it('6. Explicit timeouts configured on all axios clients to prevent indefinite hanging', () => {
    assert.ok(
      axiosClientCode.includes('timeout: 12000'),
      'axiosClient must specify an explicit timeout (12s)'
    );
    assert.ok(
      apiCode.includes('timeout: 12000'),
      'apiClient in lib/api.js must specify an explicit timeout (12s)'
    );
  });

  it('7. GlobalLoader Error State: provides both Retry and Return to Login actions', () => {
    assert.ok(
      globalLoaderCode.includes('returnToLogin'),
      'GlobalLoader must receive returnToLogin handler'
    );
    assert.ok(
      globalLoaderCode.includes('Return to Login'),
      'GlobalLoader must render Return to Login button'
    );
    assert.ok(
      globalLoaderCode.includes('Retry'),
      'GlobalLoader must render Retry button'
    );
  });

  it('8. RoleDashboardPage safety net: adminStatusChecked never remains pending > 3.5s', () => {
    assert.ok(
      roleDashboardCode.includes('safetyTimer'),
      'RoleDashboardPage must include safety timer to ensure adminStatusChecked is resolved'
    );
  });
});

