"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function LoginForm() {
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          const r = await signIn("credentials", {
            email: f.get("email"),
            password: f.get("password"),
            redirect: false,
          });
          if (r?.error)
            setError(
              "Login failed. Check your credentials or try again later.",
            );
          else {
            router.push("/admin");
            router.refresh();
          }
        } catch {
          setError("Unable to sign in. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? "Signing in…" : "Sign in securely"}
      </button>
    </form>
  );
}
