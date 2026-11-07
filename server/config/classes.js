// Saare departments, semesters aur roll number ki limit yahi ek jagah likhi hai.
// Naya department chahiye to bas yaha list me naam jod do.
const DEPARTMENTS = [
  'BCA',
  'BSc',
  'BSc Biotech',
  'BCom',
  'BBA',
  'BA',
  'MCA',
  'MSc',
  'MCom',
  'MA',
  'BEd',
  'BTech',
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const MAX_ROLL = 300;

// Roll number sirf 1 se 300 tak ka poora number ho sakta hai
function parseRoll(value) {
  const s = String(value === undefined || value === null ? '' : value).trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= MAX_ROLL ? n : null;
}

function parseSemester(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? n : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = { DEPARTMENTS, SEMESTERS, MAX_ROLL, parseRoll, parseSemester, EMAIL_RE };