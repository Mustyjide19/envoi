function checkPasswordStrength(password) {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  if (strength <= 2) return { level: 'weak', color: 'red', score: strength };
  if (strength <= 4) return { level: 'medium', color: 'yellow', score: strength };
  return { level: 'strong', color: 'green', score: strength };
}

module.exports = { checkPasswordStrength };