import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import { adminResources } from "@/lib/admin/resources";
import { PawPrint, ArrowUpRight } from "@/components/ui/icon";
import { SignOut } from "@/components/admin/sign-out";
import { databaseConfigured } from "@/lib/db";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!databaseConfigured()) redirect("/admin/login");
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="logo">
          <PawPrint size={25} />
          petsmartinn.
        </Link>
        <span className="studio-label">THE EDITORIAL STUDIO</span>
        <nav aria-label="Admin navigation">
          <Link href="/admin">Overview</Link>
          {adminResources
            .filter(
              ([k]) =>
                admin.role === "OWNER" ||
                ![
                  "users",
                  "settings",
                  "homepage",
                  "settings/amazon",
                  "amazon/import-rules",
                ].includes(k),
            )
            .map(([key, label]) => (
              <Link key={key} href={"/admin/" + key}>
                {label}
              </Link>
            ))}
        </nav>
        <div className="admin-profile">
          <strong>{admin.name}</strong>
          <small>{admin.role.toLowerCase()}</small>
          <SignOut />
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <span>Thoughtful products. Useful stories.</span>
          <Link href="/" target="_blank">
            View website <ArrowUpRight size={15} />
          </Link>
        </header>
        <main id="main" className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}
