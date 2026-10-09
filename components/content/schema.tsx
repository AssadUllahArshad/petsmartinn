import { serializeSchema } from "@/lib/seo";
export function Schema({ value }: { value: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeSchema(value) }}
    />
  );
}
