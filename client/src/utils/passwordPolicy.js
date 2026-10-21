const COMMON = new Set([
  "password", "password1", "password123", "password123!", "passw0rd", "p@ssw0rd", "p@ssword1",
  "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop", "iloveyou", "admin123",
  "welcome1", "welcome123", "letmein123", "abc12345", "monkey123", "dragon123", "football1",
  "pocketwise", "pocketwise1", "pocketwise123",
]);

export function checkPassword(password, { email = "", name = "" } = {}) {
  const lower = password.toLowerCase();
  const emailName = email.split("@")[0].toLowerCase();
  const cleanName = name.toLowerCase().replace(/\s+/g, "");

  return [
    { label: "8 to 64 characters", ok: password.length >= 8 && password.length <= 64 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter", ok: /[a-z]/.test(password) },
    { label: "One number", ok: /\d/.test(password) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}