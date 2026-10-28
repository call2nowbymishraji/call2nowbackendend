const DOB_MIN_YEAR = 1950;

// Indian mobile number in any layout ("+91 98765 43210") to the 10 stored digits.
function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

// Day, month and year from the pickers (or a stored "YYYY-MM-DD") to one comparable key.
// Calendar-invalid picks such as 30 February are rejected, not rounded.
function dobKey(input) {
  const raw = input || {};
  let year;
  let month;
  let day;
  if (typeof raw === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) return null;
    [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else {
    year = Number(raw.year);
    month = Number(raw.month);
    day = Number(raw.day);
  }
  const maxYear = new Date().getUTCFullYear();
  if (!Number.isInteger(year) || year < DOB_MIN_YEAR || year > maxYear) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

module.exports = { normalizePhone, dobKey, DOB_MIN_YEAR };
