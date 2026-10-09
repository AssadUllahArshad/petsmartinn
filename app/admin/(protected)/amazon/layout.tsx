import "./amazon.css";
export default function AmazonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="amazon-admin">{children}</div>;
}
