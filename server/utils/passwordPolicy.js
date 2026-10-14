const COMMON = new Set([
  "password", "password1", "password123", "password123!", "passw0rd", "p@ssw0rd", "p@ssword1",
  "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop", "iloveyou", "admin123",
  "welcome1", "welcome123", "letmein123", "abc12345", "monkey123", "dragon123", "football1",
  "pocketwise", "pocketwise1", "pocketwise123",
]);

export function validatePassword(password, { email = "", name = "" } = {}) {
  if (typeof password !== "string" || !password) return ["Password is required"];

  const errors = [];
  if (password.length < 8) errors.push("at least 8 characters");
  if (password.length > 64) errors.push("no more than 64 characters");
  if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
  if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
  if (!/\d/.test(password)) errors.push("one number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("one special character");

  const lower = password.toLowerCase();
  if (COMMON.has(lower)) errors.push("not a commonly used password");

  const emailName = email.split("@")[0].toLowerCase();
  if (emailName.length >= 3 && lower.includes(emailName)) errors.push("must not contain your email name");

  const cleanName = name.toLowerCase().replace(/\s+/g, "");
  if (cleanName.length >= 3 && lower.replace(/\s+/g, "").includes(cleanName)) errors.push("must not contain your name");

  return errors;
}