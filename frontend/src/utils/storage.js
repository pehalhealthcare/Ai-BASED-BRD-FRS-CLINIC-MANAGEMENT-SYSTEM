const TOKEN_KEY = 'ai_cms_access_token';
const USER_KEY = 'ai_cms_current_user';

export const storageKeys = {
  token: TOKEN_KEY,
  user: USER_KEY
};

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const setStoredToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem('token', token);
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('token');
};

export const getStoredUser = () => {
  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const setStoredUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredUser = () => {
  localStorage.removeItem(USER_KEY);
};

export const clearAuthStorage = () => {
  clearStoredToken();
  clearStoredUser();
  try {
    localStorage.removeItem('patient_carts');
    localStorage.removeItem('patientActiveClinicId');
    localStorage.removeItem('patientActivePharmacyId');
    localStorage.removeItem('patientActiveLaboratoryId');
    localStorage.removeItem('pehal_patient_active_clinic_id');
    localStorage.removeItem('pehal_patient_active_pharmacy_id');
    localStorage.removeItem('patient_active_tab');

    // Remove any keys starting with patient_lab_cart_ or patient_cart_
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('patient_lab_cart_') ||
          key.startsWith('patient_cart_') ||
          key.startsWith('patient_') ||
          key.startsWith('auraCare_'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('auraCareClosed');
      sessionStorage.clear();
    }
  } catch (err) {
    console.error('Error clearing patient storage on logout:', err);
  }
};
