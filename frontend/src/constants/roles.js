export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  RECEPTIONIST: 'RECEPTIONIST',
  DOCTOR: 'DOCTOR',
  PHARMACIST: 'PHARMACIST',
  LAB_TECHNICIAN: 'LAB_TECHNICIAN',
  PATIENT: 'PATIENT'
};

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

export const canAccessRole = (role, allowedRoles = []) => {
  if (!allowedRoles.length) {
    return true;
  }

  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
};
