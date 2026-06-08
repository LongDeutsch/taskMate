/** Độ tuổi hợp lệ trên profile: lớn hơn 18 và nhỏ hơn 100. */
export function isValidProfileAge(age: number | null | undefined): boolean {
  return age != null && age > 18 && age < 100;
}

export function getProfileAgeError(dateOfBirth: string | null | undefined): string | null {
  if (!dateOfBirth) return null;
  const age = calcAgeFromDateOfBirth(dateOfBirth);
  if (age == null) return "Ngày sinh không hợp lệ";
  if (age <= 18) return "Độ tuổi phải lớn hơn 18";
  if (age >= 100) return "Độ tuổi phải nhỏ hơn 100";
  return null;
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Giới hạn date picker: sinh nhật tương ứng tuổi 19–99. */
export function getProfileDateOfBirthBounds(): { min: string; max: string } {
  const today = new Date();
  const max = new Date(today);
  max.setFullYear(max.getFullYear() - 19);
  const min = new Date(today);
  min.setFullYear(min.getFullYear() - 99);
  return { min: toDateInputValue(min), max: toDateInputValue(max) };
}

/** Tính tuổi hiện tại từ ngày sinh (YYYY-MM-DD). */
export function calcAgeFromDateOfBirth(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  if (!y || !m || !d) return null;

  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/** Khóa ngày hôm nay (YYYY-MM-DD) — dùng cho cache query sinh nhật. */
export function getTodayDateKey(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Kiểm tra hôm nay có phải sinh nhật (so sánh tháng/ngày, bỏ qua năm). */
export function isBirthdayToday(dateOfBirth: string | null | undefined): boolean {
  if (!dateOfBirth) return false;
  const [, m, d] = dateOfBirth.split("-").map(Number);
  if (!m || !d) return false;

  const today = new Date();
  return today.getMonth() + 1 === m && today.getDate() === d;
}
