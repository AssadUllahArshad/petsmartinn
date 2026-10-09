"use client";
import { signOut } from "next-auth/react";
export function SignOut() {
  return (
    <button
      className="sign-out"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
    >
      Sign out
    </button>
  );
}
