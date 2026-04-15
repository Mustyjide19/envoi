function getPasswordValidationErrors(password) {
  const normalizedPassword = typeof password === "string" ? password : "";
  const errors = [];

  if (normalizedPassword.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(normalizedPassword)) errors.push("one uppercase letter");
  if (!/[a-z]/.test(normalizedPassword)) errors.push("one lowercase letter");
  if (!/[0-9]/.test(normalizedPassword)) errors.push("one number");
  if (!/[!@#$%^&*]/.test(normalizedPassword)) {
    errors.push("one special character (!@#$%^&*)");
  }

  return errors;
}

function isPasswordValid(password) {
  return getPasswordValidationErrors(password).length === 0;
}

const passwordValidation = {
  getPasswordValidationErrors,
  isPasswordValid,
};

module.exports = passwordValidation;
module.exports.default = passwordValidation;
