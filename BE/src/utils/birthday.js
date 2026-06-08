/** Tính tuổi hiện tại từ ngày sinh (YYYY-MM-DD hoặc Date). */
export function calcAgeFromDateOfBirth(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birth = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/** Độ tuổi hợp lệ trên profile: lớn hơn 18 và nhỏ hơn 100. */
export function isValidProfileAge(age) {
  return age != null && age > 18 && age < 100;
}

export function getProfileAgeError(dateOfBirth) {
  if (!dateOfBirth) return null;
  const age = calcAgeFromDateOfBirth(dateOfBirth);
  if (age == null) return "Ngày sinh không hợp lệ";
  if (age <= 18) return "Độ tuổi phải lớn hơn 18";
  if (age >= 100) return "Độ tuổi phải nhỏ hơn 100";
  return null;
}

export function isBirthdayToday(dateOfBirth) {
  const dob = formatDateOnly(dateOfBirth);
  if (!dob || dob.length < 10) return false;
  const today = new Date();
  const mmdd = (date) => date.slice(5, 10);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return mmdd(dob) === mmdd(todayKey);
}

export function formatDateOnly(date) {
  if (!date) return null;
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return String(date).slice(0, 10);
}
