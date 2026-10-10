/**
 * Client-side authentication validation for marketOS (mobile).
 *
 * These rules intentionally mirror the backend (backend/src/utils/validation.js)
 * and the web app (web/src/utils/validation.ts) so users get immediate feedback
 * while the server stays the source of truth.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[A-Za-z\u00C0-\u024F]+(?:[ .'\u2019-][A-Za-z\u00C0-\u024F]+)*$/;

const normalize = (value) => (typeof value === 'string' ? value.trim() : '');

export const validateFullName = (fullName) => {
  const name = normalize(fullName);
  if (!name) return 'Please enter your full name.';
  if (name.length < 3) return 'Full name must be at least 3 characters long.';
  if (!/\s/.test(name)) {
    return 'Please enter both your first name and last name, separated by a space.';
  }
  if (!NAME_RE.test(name)) {
    return 'Full name may only contain letters, spaces, hyphens and apostrophes.';
  }
  return null;
};

export const validateEmail = (email) => {
  const value = normalize(email);
  if (!value) return 'Please enter your email address.';
  if (value.length > 254) return 'That email address is too long.';
  if (!EMAIL_RE.test(value)) {
    return 'Please enter a valid email address (e.g. name@example.com).';
  }
  return null;
};

export const validatePassword = (password) => {
  const value = typeof password === 'string' ? password : '';
  if (!value) return 'Please enter a password.';
  if (value.length < 8) return 'Password must be at least 8 characters long.';
  if (value.length > 72) return 'Password must be 72 characters or fewer.';
  if (!/[A-Za-z]/.test(value)) return 'Password must include at least one letter.';
  if (!/[0-9]/.test(value)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(value)) {
    return 'Password must include at least one special character (e.g. ! @ # $ %).';
  }
  return null;
};

const buildResult = (errors) => {
  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    message: valid ? 'Validation passed' : Object.values(errors)[0],
  };
};

export const validateSignup = (payload = {}) => {
  const { fullName, username, email, password, confirmPassword } = payload;
  const nameValue = fullName != null ? fullName : username;

  const errors = {};
  const nameError = validateFullName(nameValue);
  if (nameError) errors.fullName = nameError;

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;

  if (confirmPassword !== undefined || password) {
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.';
    }
  }

  return buildResult(errors);
};

export const validateSignin = (payload = {}) => {
  const { email, password } = payload;
  const errors = {};

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  if (typeof password !== 'string' || password.length === 0) {
    errors.password = 'Please enter your password.';
  }

  return buildResult(errors);
};

export const validateForgotPassword = (payload = {}) => {
  const errors = {};
  const emailError = validateEmail(payload.email);
  if (emailError) errors.email = emailError;
  return buildResult(errors);
};
