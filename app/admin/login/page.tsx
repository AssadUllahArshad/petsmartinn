import Link from "next/link";
import { PawPrint } from "@/components/ui/icon";
import { LoginForm } from "@/components/admin/login";
import { databaseConfigured } from "@/lib/db";
export default function Login() {
  return (
    <main id="main" className="login-page">
      <div className="login-card">
        <Link href="/" className="logo">
          <PawPrint />
          petsmartinn.
        </Link>
        <span className="eyebrow">The editorial studio</span>
        <h1>Welcome back.</h1>
        <p>Manage thoughtful products and useful content.</p>
        {databaseConfigured() ? (
          <LoginForm />
        ) : (
          <div className="notice">
            Connect PostgreSQL and create an administrator using the setup
            instructions in README.md. There is no default password.
          </div>
        )}
        <Link className="text-link" href="/">
          ← Back to the website
        </Link>
      </div>
    </main>
  );
}
