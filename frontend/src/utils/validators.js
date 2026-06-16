export const isRequired = (value) =>
  !(value === null || typeof value === 'undefined' || String(value).trim() === '');

export const isValidEmail = (value) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

export const isValidPhone = (value) =>
  !value || /^[0-9+\-\s()]{8,20}$/.test(String(value).trim());

export const validateRequiredFields = (payload = {}, fields = []) =>
  fields.reduce((errors, field) => {
    if (!isRequired(payload[field])) {
      errors[field] = `${field} is required`;
    }

    return errors;
  }, {});
