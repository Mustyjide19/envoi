const { checkPasswordStrength } = require('../utils/passwordStrength');

describe('Password Strength Checker', () => {
  test('weak password - too short', () => {
    const result = checkPasswordStrength('abc');
    expect(result.level).toBe('weak');
  });

  test('weak password - no special chars', () => {
    const result = checkPasswordStrength('password');
    expect(result.level).toBe('weak');
  });

  test('medium password', () => {
    const result = checkPasswordStrength('Password123');
    expect(result.level).toBe('medium');
  });

  test('strong password', () => {
    const result = checkPasswordStrength('MySecurePass123!');
    expect(result.level).toBe('strong');
  });
});