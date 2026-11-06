import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeDoctorName } from '../utils/doctorFormatters.js';

describe('Dashboard Layout Enhancement & Intelligent Section Scrolling Tests', () => {
  const queuePath = path.resolve('frontend/src/features/dashboard/admin/CheckedInQueue.jsx');
  const apptPath = path.resolve('frontend/src/features/dashboard/admin/AppointmentSection.jsx');
  const doctorPath = path.resolve('frontend/src/features/dashboard/admin/DoctorStatusSection.jsx');
  const branchPath = path.resolve('frontend/src/features/dashboard/admin/BranchOverview.jsx');
  const staffPath = path.resolve('frontend/src/features/dashboard/admin/StaffOverview.jsx');
  const providersPath = path.resolve('frontend/src/features/dashboard/admin/HealthcareProviders.jsx');
  const dashboardPath = path.resolve('frontend/src/features/dashboard/admin/AdminDashboardPage.jsx');
  const reusablePath = path.resolve('frontend/src/features/dashboard/admin/DashboardScrollableSection.jsx');

  const queueCode = fs.readFileSync(queuePath, 'utf8');
  const apptCode = fs.readFileSync(apptPath, 'utf8');
  const doctorCode = fs.readFileSync(doctorPath, 'utf8');
  const branchCode = fs.readFileSync(branchPath, 'utf8');
  const staffCode = fs.readFileSync(staffPath, 'utf8');
  const providersCode = fs.readFileSync(providersPath, 'utf8');
  const dashboardCode = fs.readFileSync(dashboardPath, 'utf8');
  const reusableCode = fs.readFileSync(reusablePath, 'utf8');

  it('1. Checked-In Patients: Height increased and balanced with AppointmentSection (h-[460px])', () => {
    assert.ok(
      queueCode.includes('h-[460px]'),
      'CheckedInQueue must have h-[460px] to match AppointmentSection and eliminate empty grey area'
    );
    assert.ok(
      apptCode.includes('h-[460px]'),
      'AppointmentSection must have matching h-[460px]'
    );
    assert.ok(
      queueCode.includes('flex flex-col'),
      'CheckedInQueue must use flex-col layout'
    );
  });

  it('2. Checked-In Patients: Centers empty state when queue is empty', () => {
    assert.ok(
      queueCode.includes('flex-1 min-h-0 flex flex-col items-center justify-center'),
      'Empty state in CheckedInQueue must be vertically and horizontally centered'
    );
  });

  it('3. Today Appointments: Supports internal vertical scrolling with fixed header & sticky table header', () => {
    assert.ok(
      apptCode.includes('overflow-y-auto'),
      'AppointmentSection must have internal vertical scrolling'
    );
    assert.ok(
      apptCode.includes('sticky top-0'),
      'Table header must be sticky when scrolling appointments'
    );
    assert.ok(
      apptCode.includes('shrink-0'),
      'Header and status tabs must be fixed (shrink-0)'
    );
  });

  it('4. Doctor Status Overview: Horizontal scrolling with mouse-wheel, drag and arrow navigation', () => {
    assert.ok(
      doctorCode.includes('overflow-x-auto'),
      'DoctorStatusSection must scroll horizontally'
    );
    assert.ok(
      doctorCode.includes('ChevronLeft') && doctorCode.includes('ChevronRight'),
      'DoctorStatusSection must provide left and right navigation arrow buttons'
    );
    assert.ok(
      doctorCode.includes('scrollByAmount'),
      'DoctorStatusSection must implement scrollByAmount for arrow clicks'
    );
    assert.ok(
      doctorCode.includes('onWheel'),
      'DoctorStatusSection must handle mouse-wheel event for horizontal scrolling'
    );
    assert.ok(
      doctorCode.includes('handleMouseDown') && doctorCode.includes('handleMouseMove'),
      'DoctorStatusSection must support click-and-drag scrolling'
    );
  });

  it('5. Doctor Name Normalization in Doctor cards: displays Dr. prefix exactly once', () => {
    assert.strictEqual(normalizeDoctorName('Shyam Ram'), 'Dr. Shyam Ram');
    assert.strictEqual(normalizeDoctorName('Dr. Shyam Ram'), 'Dr. Shyam Ram');
    assert.strictEqual(normalizeDoctorName('Dr. Dr. Shyam Ram'), 'Dr. Shyam Ram');
    assert.ok(
      doctorCode.includes('normalizeDoctorName'),
      'DoctorStatusSection must utilize normalizeDoctorName'
    );
  });

  it('6. Bottom row cards (Branch, Staff, Providers) have consistent height (h-[390px]) and internal scroll', () => {
    assert.ok(branchCode.includes('h-[390px]') && branchCode.includes('overflow-y-auto'), 'BranchOverview must be h-[390px] with vertical scroll');
    assert.ok(staffCode.includes('h-[390px]') && staffCode.includes('overflow-y-auto'), 'StaffOverview must be h-[390px] with vertical scroll');
    assert.ok(providersCode.includes('h-[390px]') && providersCode.includes('overflow-y-auto'), 'HealthcareProviders must be h-[390px] with vertical scroll');
  });

  it('7. Reusable DashboardScrollableSection component exists and provides standard architecture', () => {
    assert.ok(reusableCode.includes('DashboardScrollableSection'), 'Component must be exported');
    assert.ok(reusableCode.includes('scrollDirection'), 'Component must support scrollDirection');
    assert.ok(reusableCode.includes('dashboard-custom-scroll'), 'Component must apply dashboard-custom-scroll');
  });

  it('8. Dashboard grid enforces items-stretch for balanced card row alignment', () => {
    assert.ok(
      dashboardCode.includes('items-stretch'),
      'AdminDashboardPage grid must use items-stretch'
    );
  });
});

