const messages = new Map<string, string>([
  ["temporarily_unavailable", "The sign-in service is temporarily unavailable. Please try again."],
  ["account_conflict", "This identity cannot be linked to the account. Contact your administrator."],
  ["profile_incomplete", "Your identity profile is incomplete. Contact your administrator."],
]);

export function AuthErrorPage({ error }: { error?: string }) {
  return <main>
    <h1>Unable to sign in</h1>
    <p role="alert">{messages.get(error ?? "") ?? "We could not complete sign-in. Please try again or contact your administrator."}</p>
    <a href="/session/login">Try sign-in again</a>
  </main>;
}
