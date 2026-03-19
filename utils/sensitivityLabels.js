const SENSITIVITY_LABELS = ["Academic", "Private", "Sensitive"];

function normalizeSensitivityLabel(value = "") {
  const normalized = String(value).trim();
  return SENSITIVITY_LABELS.includes(normalized) ? normalized : "";
}

module.exports = {
  SENSITIVITY_LABELS,
  normalizeSensitivityLabel,
};
