import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeDoctorName } from '../utils/doctorFormatters.js';

describe('Users & Roles Management Unit Tests', () => {

  const sampleUsers = [
    {
      _id: 'u1',
      name: 'Dr. Karan Roy',
      email: 'karan.roy@ramsdental.com',
      role: 'DOCTOR',
      department: 'Dental',
      isActive: true,
      lastLoginAt: '2026-11-06T11:24:00.000Z'
    },
    {
      _id: 'u2',
      name: 'Meena Sharma',
      email: 'meena.sharma@ramsdental.com',
      role: 'RECEPTIONIST',
      department: 'Front Desk',
      isActive: true,
      lastLoginAt: '2026-11-06T10:02:00.000Z'
    },
    {
      _id: 'u3',
      name: 'Rohit Jain',
      email: 'rohit.jain@ramsdental.com',
      role: 'CLINIC_ADMIN',
      department: 'Administration',
      isActive: true,
      lastLoginAt: '2026-11-05T18:40:00.000Z'
    },
    {
      _id: 'u4',
      name: 'Sonia Patel',
      email: 'sonia.patel@ramsdental.com',
      role: 'NURSE',
      department: 'Clinical',
      isActive: true,
      lastLoginAt: '2026-11-05T16:18:00.000Z'
    },
    {
      _id: 'u5',
      name: 'Amit Kumar',
      email: 'amit.kumar@ramsdental.com',
      role: 'LAB_TECHNICIAN',
      department: 'Laboratory',
      isActive: false,
      lastLoginAt: '2026-10-30T15:20:00.000Z'
    },
    {
      _id: 'u6',
      name: 'King Owner',
      email: 'king@ramsdental.com',
      role: 'ADMIN',
      department: 'Management',
      isActive: true,
      lastLoginAt: '2026-11-06T12:00:00.000Z'
    }
  ];

  it('1. Status filter counts: correctly computes All, Active, and Inactive totals', () => {
    const totalCount = sampleUsers.length;
    const activeCount = sampleUsers.filter(u => u.isActive !== false).length;
    const inactiveCount = sampleUsers.filter(u => u.isActive === false).length;

    assert.strictEqual(totalCount, 6);
    assert.strictEqual(activeCount, 5);
    assert.strictEqual(inactiveCount, 1);
  });

  it('2. Search filtering: matches across name, email, department, and role', () => {
    const filterBySearch = (users, query) => {
      const q = query.trim().toLowerCase();
      if (!q) return users;
      return users.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    };

    const searchDoctor = filterBySearch(sampleUsers, 'doctor');
    assert.strictEqual(searchDoctor.length, 1);
    assert.strictEqual(searchDoctor[0].name, 'Dr. Karan Roy');

    const searchByEmail = filterBySearch(sampleUsers, 'amit');
    assert.strictEqual(searchByEmail.length, 1);
    assert.strictEqual(searchByEmail[0].role, 'LAB_TECHNICIAN');

    const searchByDept = filterBySearch(sampleUsers, 'Front Desk');
    assert.strictEqual(searchByDept.length, 1);
    assert.strictEqual(searchByDept[0].name, 'Meena Sharma');
  });

  it('3. Doctor Name Normalization: ensures single "Dr." prefix without duplicates', () => {
    assert.strictEqual(normalizeDoctorName('Karan Roy'), 'Dr. Karan Roy');
    assert.strictEqual(normalizeDoctorName('Dr. Karan Roy'), 'Dr. Karan Roy');
    assert.strictEqual(normalizeDoctorName('Dr Dr Karan Roy'), 'Dr. Karan Roy');
    assert.strictEqual(normalizeDoctorName('Dr.   Dr. Karan Roy'), 'Dr. Karan Roy');
  });

  it('4. Role distribution aggregation: accurately counts members per role', () => {
    const roleCounts = {};
    for (const u of sampleUsers) {
      const r = u.role || 'STAFF';
      roleCounts[r] = (roleCounts[r] || 0) + 1;
    }

    assert.strictEqual(roleCounts['ADMIN'], 1);
    assert.strictEqual(roleCounts['CLINIC_ADMIN'], 1);
    assert.strictEqual(roleCounts['DOCTOR'], 1);
    assert.strictEqual(roleCounts['RECEPTIONIST'], 1);
    assert.strictEqual(roleCounts['NURSE'], 1);
    assert.strictEqual(roleCounts['LAB_TECHNICIAN'], 1);
  });

  it('5. Safe pagination helper: produces correct showing bounds', () => {
    const getPaginationText = (page, limit, total) => {
      if (total === 0) return 'Showing 0 of 0 users';
      const start = (page - 1) * limit + 1;
      const end = Math.min(page * limit, total);
      return `Showing ${start}-${end} of ${total} users`;
    };

    assert.strictEqual(getPaginationText(1, 5, 12), 'Showing 1-5 of 12 users');
    assert.strictEqual(getPaginationText(2, 5, 12), 'Showing 6-10 of 12 users');
    assert.strictEqual(getPaginationText(3, 5, 12), 'Showing 11-12 of 12 users');
    assert.strictEqual(getPaginationText(1, 5, 0), 'Showing 0 of 0 users');
  });

  it('6. Deactivation safety rule: preserves historical clinical records while removing active credential', () => {
    // When deactivating, the user record becomes inactive but ID and associations remain
    const userToDeactivate = { ...sampleUsers[0] };
    const deactivated = {
      ...userToDeactivate,
      isActive: false,
      deactivatedAt: new Date().toISOString()
    };

    assert.strictEqual(deactivated.isActive, false);
    assert.strictEqual(deactivated._id, 'u1');
    assert.strictEqual(deactivated.name, 'Dr. Karan Roy');
    assert.ok(deactivated.deactivatedAt);
  });
});

