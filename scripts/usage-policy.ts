import policy from "../benchmark/usage-policy.json";

// A nominal USD estimate does not prove that a request is covered by credits.
// These legacy adapters cannot verify credit balance and a no-charge cutoff.
// The separate bounded trial requires a user-confirmed free AssemblyAI account
// without payment method or auto-pay; it is limited to one short submission.
export function requireVerifiedFreeCredits(service: string): void {
  if (
    policy.mode !== "free-credits-only" ||
    policy.maxOutOfPocketUsd !== 0 ||
    policy.paidFallbackAllowed !== false ||
    policy.requireVerifiedCreditBalanceAndHardStop !== true
  ) {
    throw new Error(
      "Usage policy must preserve the user's $0 out-of-pocket limit.",
    );
  }
  throw new Error(
    `Free-credit-only policy: ${service} is blocked because available credits and an enforced no-charge cutoff have not been verified. No request was made. --allow-paid cannot override this policy.`,
  );
}
