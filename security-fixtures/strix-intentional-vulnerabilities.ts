// SECURITY TEST FIXTURE ONLY.
// This file is intentionally vulnerable and is NOT imported or executed by the application.
// It exists only to verify that Strix detects obvious security issues in a pull request.

export function unsafeEval(input: string) {
  // Intentional code injection sink for security scanner validation.
  return eval(input);
}

export function buildUnsafeSql(userId: string) {
  // Intentional SQL injection pattern for security scanner validation.
  return "SELECT * FROM users WHERE id = '" + userId + "'";
}

export const hardcodedTestSecret =
  "sk_test_STRIX_DETECTION_ONLY_NOT_A_REAL_KEY_1234567890";
