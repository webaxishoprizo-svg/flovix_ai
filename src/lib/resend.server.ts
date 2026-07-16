// Transactional email sender utilizing Resend REST API (fetch-based, zero NPM dependencies).
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is missing. Email dispatch aborted.");
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Flovix AI <noreply@flovix.app>", // fallback or default sender
        to,
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Resend REST Error: ${res.status} - ${errBody}`);
    }

    const data = (await res.json()) as { id: string };
    return { ok: true, id: data.id };
  } catch (e) {
    console.error("Resend delivery failed:", e);
    return { ok: false, error: (e as Error).message };
  }
}
