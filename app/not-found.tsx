import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="container empty-state">
      <span className="eyebrow">A little detour</span>
      <h1>This page wandered off.</h1>
      <p>Explore our essentials and guides from the homepage.</p>
      <Link href="/" className="button">
        Back to Petsmartinn
      </Link>
    </main>
  );
}
