export const sections = [
  {
    key: "buying-guides",
    type: "BUYING_GUIDE",
    name: "Buying guides",
    description:
      "Thoughtful comparisons and practical advice for choosing pet essentials.",
  },
  {
    key: "dog-breeds",
    type: "DOG_BREED",
    name: "Dog breeds",
    description: "Explore personalities, care needs, and life with dogs.",
  },
  {
    key: "cat-breeds",
    type: "CAT_BREED",
    name: "Cat breeds",
    description: "Get to know your feline companion.",
  },
  {
    key: "pet-health",
    type: "HEALTH",
    name: "Pet health",
    description: "Source-led information with a veterinary review process.",
  },
  {
    key: "blog",
    type: "BLOG",
    name: "The pet journal",
    description: "Ideas for happier days together.",
  },
  { key: "pages", type: "PAGE", name: "Pages", description: "" },
] as const;
export function contentPath(c: {
  type: string;
  slug: string;
  species?: string;
}) {
  const section = sections.find((s) => s.type === c.type);
  return c.type === "PAGE"
    ? "/" + c.slug
    : c.type === "HEALTH"
      ? `/pet-health/${c.species ?? "dogs"}/${c.slug}`
      : `/${section?.key ?? "blog"}/${c.slug}`;
}
