"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Block } from "@/types/content";
import { contentTypes } from "@/lib/admin/resources";
import { defaultSettings } from "@/lib/demo";
type Data = Record<string, unknown>;
type Option = {
  id: string;
  name?: string;
  title?: string;
  label?: string;
  path?: string;
  url?: string;
  type?: string;
};
type Options = {
  categories: Option[];
  brands: Option[];
  products: Option[];
  content: Option[];
  authors: Option[];
  media: Option[];
  navigation: Option[];
};
const seo = {
  title: "",
  description: "",
  h1: "",
  canonical: "",
  noindex: false,
  nofollow: false,
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  primaryKeyword: "",
  secondaryKeywords: [],
  searchIntent: "",
  targetCountry: "US",
};
const aeo = {
  entity: "",
  directAnswer: "",
  takeaways: [],
  semanticTerms: [],
  whoFor: "",
  importantFacts: [],
  comparisonSummary: "",
  faqs: [],
};
function defaults(resource: string): Data {
  const shared = { seo, aeo, status: "DRAFT" };
  if (resource === "products")
    return {
      ...shared,
      title: "",
      slug: "",
      sku: null,
      brandId: null,
      shortDescription: "",
      description: "",
      features: [],
      pros: [],
      cons: [],
      bestFor: "",
      notIdealFor: "",
      mainImage: "/images/product-harness.svg",
      imageAlt: "",
      price: null,
      oldPrice: null,
      currency: "USD",
      rating: null,
      reviewCount: null,
      badge: null,
      featured: false,
      merchant: "Amazon",
      affiliateUrl: "",
      buttonText: "Shop Now",
      openNewTab: true,
      trackClicks: true,
      affiliateDisclosure: "",
      categoryIds: [],
      relatedProductIds: [],
      gallery: [],
    };
  if (resource === "categories")
    return {
      ...shared,
      name: "",
      slug: "",
      path: "/dogs/",
      parentId: null,
      image: "/images/product-harness.svg",
      icon: "paw",
      intro: "",
      body: "",
      featured: false,
      order: 0,
    };
  if (resource === "brands")
    return {
      ...shared,
      name: "",
      slug: "",
      logo: "",
      description: "",
      body: "",
      featured: false,
    };
  if (contentTypes[resource])
    return {
      ...shared,
      type: contentTypes[resource],
      title: "",
      slug: "",
      species: "dogs",
      excerpt: "",
      image: "",
      imageAlt: "",
      blocks: [],
      specialized: {},
      tags: [],
      authorId: null,
      reviewerId: null,
      reviewedAt: null,
      emergencyWarning: "",
      disclaimer: "",
      productIds: [],
      categoryIds: [],
      relatedContentIds: [],
      faqs: [],
      sources: [],
    };
  if (resource === "authors")
    return {
      name: "",
      slug: "",
      bio: "",
      image: null,
      jobTitle: null,
      credentials: null,
      expertise: [],
      socialLinks: {},
      type: "Editorial",
    };
  if (resource === "navigation")
    return {
      label: "",
      href: "/",
      location: "header",
      parentId: null,
      order: 0,
      visible: true,
    };
  if (resource === "users")
    return { name: "", email: "", role: "EDITOR", active: true };
  return { ...defaultSettings };
}
export function RecordEditor({
  resource,
  id,
  initial,
  options,
}: {
  resource: string;
  id?: string;
  initial?: Data;
  options: Options;
}) {
  const [data, setData] = useState<Data>({ ...defaults(resource), ...initial }),
    [tab, setTab] = useState("Content"),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const router = useRouter();
  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));
  const child = (group: string, k: string, v: unknown) =>
    setData((d) => ({ ...d, [group]: { ...(d[group] as Data), [k]: v } }));
  const value = (k: string) => data[k];
  function field(k: string, label: string, kind = "text", group?: string) {
    const val = group ? (data[group] as Data)?.[k] : value(k);
    const change = (v: unknown) => (group ? child(group, k, v) : set(k, v));
    if (kind === "check")
      return (
        <label className="checkbox-field" key={k}>
          <input
            type="checkbox"
            checked={Boolean(val)}
            onChange={(e) => change(e.target.checked)}
          />
          {label}
        </label>
      );
    return (
      <label key={k}>
        {label}
        {kind === "textarea" || kind === "lines" ? (
          <textarea
            rows={kind === "lines" ? 4 : 5}
            value={Array.isArray(val) ? val.join("\n") : String(val ?? "")}
            onChange={(e) =>
              change(
                kind === "lines"
                  ? e.target.value.split("\n").filter(Boolean)
                  : e.target.value,
              )
            }
          />
        ) : (
          <input
            type={kind}
            step={
              kind === "number"
                ? ["reviewCount", "order"].includes(k)
                  ? 1
                  : "any"
                : undefined
            }
            value={String(val ?? "")}
            onChange={(e) =>
              change(
                kind === "number"
                  ? e.target.value === ""
                    ? null
                    : Number(e.target.value)
                  : e.target.value ||
                      ([
                        "sku",
                        "reviewedAt",
                        "credentials",
                        "jobTitle",
                      ].includes(k)
                        ? null
                        : ""),
              )
            }
          />
        )}
      </label>
    );
  }
  function select(k: string, label: string, opts: Option[], multi = false) {
    return (
      <label key={k}>
        {label}
        <select
          aria-label={label}
          multiple={multi}
          value={multi ? ((data[k] as string[]) ?? []) : String(data[k] ?? "")}
          onChange={(e) =>
            set(
              k,
              multi
                ? Array.from(e.target.selectedOptions, (o) => o.value)
                : e.target.value || null,
            )
          }
        >
          {!multi && <option value="">None</option>}
          {opts
            .filter((o) => o.id !== id)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.name || o.title || o.label}
                {o.path ? " · " + o.path : ""}
              </option>
            ))}
        </select>
        {multi && (
          <small>
            Use Ctrl / Command to select multiple. The first category is
            primary.
          </small>
        )}
      </label>
    );
  }
  function enumSelect(k: string, label: string, values: string[]) {
    return (
      <label key={k}>
        {label}
        <select
          aria-label={label}
          value={String(data[k] ?? "")}
          onChange={(e) => set(k, e.target.value)}
        >
          {values.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
    );
  }
  async function save() {
    setPending(true);
    setError("");
    try {
      const r = await fetch("/api/admin/" + resource + (id ? "/" + id : ""), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          resource === "users" && !data.password
            ? { ...data, password: undefined }
            : data,
        ),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      router.push("/admin/" + resource);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setPending(false);
    }
  }
  const hasSeo = [
    "products",
    "categories",
    "brands",
    ...Object.keys(contentTypes),
  ].includes(resource);
  const tabs = hasSeo
    ? [
        "Content",
        ...(resource === "products" ? ["Affiliate"] : []),
        "SEO",
        "Answers & entities",
        ...(contentTypes[resource]
          ? [
              "Relationships",
              ...(resource === "pet-health" ? ["Medical review"] : []),
            ]
          : []),
      ]
    : ["Content"];
  return (
    <div className="editor">
      <div className="editor-tabs" role="tablist" aria-label="Editor sections">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="editor-body">
          {resource === "products" && data.source === "AMAZON_MOCK" && (
            <p className="admin-notice">
              Mock fixture: price, commission, rating, reviews and availability
              are simulated data, not real Amazon data. This product must remain
              a draft.
            </p>
          )}
          {tab === "Content" && (
            <>
              {resource === "products" && (
                <>
                  <div className="form-grid">
                    {field("title", "Product name")}
                    {field("slug", "Slug")}
                    {field("sku", "Internal SKU")}
                    {select("brandId", "Brand", options.brands)}
                    {select(
                      "categoryIds",
                      "Categories (first is primary)",
                      options.categories,
                      true,
                    )}
                    {enumSelect("status", "Status", ["DRAFT", "PUBLISHED"])}
                    {field(
                      "price",
                      data.source === "AMAZON_MOCK"
                        ? "Display price (mock data)"
                        : "Display price",
                      "number",
                    )}
                    {field("oldPrice", "Previous price", "number")}
                    {field("currency", "Currency")}
                    {field(
                      "rating",
                      data.source === "AMAZON_MOCK"
                        ? "Rating (mock data)"
                        : "Rating (verified data only)",
                      "number",
                    )}
                    {field(
                      "reviewCount",
                      data.source === "AMAZON_MOCK"
                        ? "Review count (mock data)"
                        : "Review count (verified data only)",
                      "number",
                    )}
                    {field("badge", "Badge")}
                    {field("featured", "Featured", "check")}
                  </div>
                  {field("shortDescription", "Short description", "textarea")}
                  {field("description", "Full description", "textarea")}
                  <div className="form-grid">
                    {field("features", "Key features (one per line)", "lines")}
                    {field("pros", "Pros (one per line)", "lines")}
                    {field("cons", "Cons (one per line)", "lines")}
                    {field("bestFor", "Best for")}
                    {field("notIdealFor", "Not ideal for")}
                  </div>
                  {field("mainImage", "Main image URL")}
                  {field("imageAlt", "Image alternative text")}
                  <MediaPicker
                    options={options.media}
                    onSelect={(url) => set("mainImage", url)}
                  />
                  <JsonEditor
                    label="Gallery images"
                    value={data.gallery}
                    onChange={(v) => set("gallery", v)}
                    hint='[{"url":"/images/product-harness.svg","alt":"Product view"}]'
                  />
                  {select(
                    "relatedProductIds",
                    "Related products",
                    options.products,
                    true,
                  )}
                </>
              )}
              {resource === "categories" && (
                <>
                  <div className="form-grid">
                    {field("name", "Category name")}
                    {field("slug", "Slug")}
                    {field("path", "Public URL path")}
                    {select("parentId", "Parent category", options.categories)}
                    {enumSelect("status", "Status", ["DRAFT", "PUBLISHED"])}
                    {field("order", "Display order", "number")}
                    {field("featured", "Featured", "check")}
                  </div>
                  {field("image", "Image URL")}
                  {field("icon", "Icon name")}
                  {field("intro", "Introduction", "textarea")}
                  {field(
                    "body",
                    "Original buying advice / SEO content",
                    "textarea",
                  )}
                </>
              )}
              {resource === "brands" && (
                <>
                  <div className="form-grid">
                    {field("name", "Brand name")}
                    {field("slug", "Slug")}
                    {enumSelect("status", "Status", ["DRAFT", "PUBLISHED"])}
                    {field("featured", "Featured", "check")}
                  </div>
                  {field("logo", "Logo URL")}
                  {field("description", "Introduction", "textarea")}
                  {field("body", "Original brand content", "textarea")}
                </>
              )}
              {contentTypes[resource] && (
                <>
                  <div className="form-grid">
                    {field("title", "Title")}
                    {field("slug", "Slug")}
                    {enumSelect(
                      "status",
                      "Editorial status",
                      resource === "pet-health"
                        ? ["DRAFT", "NEEDS_REVIEW", "REVIEWED", "PUBLISHED"]
                        : ["DRAFT", "PUBLISHED"],
                    )}
                    {select("authorId", "Author", options.authors)}
                    {enumSelect("species", "Species", ["dogs", "cats"])}
                  </div>
                  {field("excerpt", "Excerpt", "textarea")}
                  {field("image", "Featured image URL")}
                  {field("imageAlt", "Image alternative text")}
                  <MediaPicker
                    options={options.media}
                    onSelect={(url) => set("image", url)}
                  />
                  <BlockEditor
                    value={data.blocks as Block[]}
                    onChange={(v) => set("blocks", v)}
                    products={options.products}
                  />
                  {resource.endsWith("breeds") && (
                    <SpecializedFields
                      value={data.specialized as Data}
                      onChange={(v) => set("specialized", v)}
                      fields={[
                        "breedName",
                        "alternativeNames",
                        "size",
                        "weightRange",
                        "heightRange",
                        "lifespan",
                        "temperament",
                        "coatType",
                        "sheddingLevel",
                        "exerciseNeeds",
                        "groomingNeeds",
                        "trainability",
                        "goodWithChildren",
                        "goodWithOtherPets",
                        "commonHealthConcerns",
                        "overview",
                        "history",
                        "appearance",
                        "personality",
                        "care",
                        "exercise",
                        "grooming",
                        "feeding",
                        "training",
                        "health",
                      ]}
                    />
                  )}{" "}
                  {resource === "pet-health" && (
                    <SpecializedFields
                      value={data.specialized as Data}
                      onChange={(v) => set("specialized", v)}
                      fields={[
                        "medicalCategory",
                        "symptoms",
                        "causes",
                        "diagnosis",
                        "treatmentOverview",
                        "prevention",
                        "whenToCallAVet",
                      ]}
                    />
                  )}{" "}
                  {field("tags", "Tags (one per line)", "lines")}
                  <JsonEditor
                    label="FAQ questions and answers"
                    value={data.faqs}
                    onChange={(v) => set("faqs", v)}
                    hint='[{"question":"...","answer":"..."}]'
                  />
                  <JsonEditor
                    label="Sources and references"
                    value={data.sources}
                    onChange={(v) => set("sources", v)}
                    hint='[{"title":"Source title","url":"https://..."}]'
                  />
                </>
              )}
              {resource === "authors" && (
                <>
                  <div className="form-grid">
                    {field("name", "Name")}
                    {field("slug", "Slug")}
                    {field("jobTitle", "Job title")}
                    {enumSelect("type", "Author type", [
                      "Editorial",
                      "Pet Writer",
                      "Veterinary Reviewer",
                      "Contributor",
                    ])}
                  </div>
                  {field("bio", "Biography", "textarea")}
                  {field(
                    "credentials",
                    "Credentials (genuine qualifications only)",
                  )}
                  {field("expertise", "Areas of expertise", "lines")}
                  {field("image", "Profile image URL")}
                  <JsonEditor
                    label="Social links"
                    value={data.socialLinks}
                    onChange={(v) => set("socialLinks", v)}
                    hint='{"website":"https://..."}'
                  />
                </>
              )}
              {resource === "navigation" && (
                <>
                  <div className="form-grid">
                    {field("label", "Label")}
                    {field("href", "Destination URL")}
                    {enumSelect("location", "Menu", ["header", "footer"])}
                    {select("parentId", "Parent item", options.navigation)}
                    {field("order", "Order", "number")}
                    {field("visible", "Visible", "check")}
                  </div>
                </>
              )}
              {resource === "users" && (
                <>
                  <div className="form-grid">
                    {field("name", "Name")}
                    {field("email", "Email", "email")}
                    {field(
                      "password",
                      id
                        ? "New password (leave empty to keep current)"
                        : "Password (at least 12 characters)",
                      "password",
                    )}
                    {enumSelect("role", "Role", ["EDITOR", "OWNER"])}
                    {field("active", "Account active", "check")}
                  </div>
                  <p className="notice">
                    Owners manage settings and administrator permissions.
                    Editors manage products and content.
                  </p>
                </>
              )}
              {resource === "settings" && (
                <>
                  {field(
                    "demoMode",
                    "Development preview banner and noindex",
                    "check",
                  )}
                  <div className="form-grid">
                    {field("siteName", "Site name")}
                    {field("organizationName", "Organization name")}
                    {field("contactEmail", "Contact email", "email")}
                    {field(
                      "googleAnalyticsId",
                      "Google Analytics ID (stored; activation requires privacy review)",
                    )}
                    {field(
                      "searchConsoleVerification",
                      "Search Console verification",
                    )}
                    {field("logo", "Logo URL")}
                    {field("favicon", "Favicon URL")}
                    {field("defaultSocialImage", "Default social image URL")}
                    {select(
                      "defaultAuthorId",
                      "Default author",
                      options.authors,
                    )}
                  </div>
                  {field("defaultTitle", "Default SEO title")}
                  {field(
                    "defaultDescription",
                    "Default meta description",
                    "textarea",
                  )}
                  {field(
                    "affiliateDisclosure",
                    "Affiliate disclosure",
                    "textarea",
                  )}
                  {field(
                    "defaultMedicalDisclaimer",
                    "Default medical disclaimer",
                    "textarea",
                  )}
                  {field("footerText", "Footer text")}
                  <JsonEditor
                    label="Social profiles"
                    value={data.socialProfiles}
                    onChange={(v) => set("socialProfiles", v)}
                    hint='{"instagram":"https://..."}'
                  />
                </>
              )}
              {resource === "homepage" && (
                <>
                  {field(
                    "heroTitle",
                    "Hero title (new lines supported)",
                    "textarea",
                  )}
                  {field("heroSubtitle", "Hero subtitle", "textarea")}
                  {field("heroImage", "Hero image URL")}
                  {field("heroButtonText", "Button text")}
                  {field("heroButtonUrl", "Button destination")}
                  {select(
                    "featuredProductIds",
                    "Featured products",
                    options.products,
                    true,
                  )}
                  {select(
                    "featuredCategoryIds",
                    "Featured categories",
                    options.categories,
                    true,
                  )}
                  {select(
                    "featuredBrandIds",
                    "Featured brands",
                    options.brands,
                    true,
                  )}
                  {select(
                    "featuredContentIds",
                    "Featured guides and articles",
                    options.content,
                    true,
                  )}
                  {field(
                    "sectionOrder",
                    "Section order (pets, categories, products, brands, guides, advice, newsletter)",
                    "lines",
                  )}
                  {field(
                    "hiddenSections",
                    "Hidden sections (one per line)",
                    "lines",
                  )}
                  <p className="notice">
                    The newsletter section currently links to guides. Email
                    collection requires a configured mailing provider.
                  </p>
                </>
              )}
            </>
          )}
          {tab === "Affiliate" && (
            <>
              <p className="notice">
                The URL is saved exactly as entered. Tracking parameters are
                never removed or rebuilt.
              </p>
              {field("merchant", "Merchant")}
              {field("affiliateUrl", "Affiliate URL", "url")}
              {enumSelect("buttonText", "Button text", [
                "Shop Now",
                "View on Amazon",
                "Check Price",
                "See Deal",
              ])}
              {field("openNewTab", "Open in new tab", "check")}
              {field("trackClicks", "Track clicks", "check")}
              {field(
                "affiliateDisclosure",
                "Product-specific disclosure (optional)",
                "textarea",
              )}
            </>
          )}
          {tab === "SEO" && (
            <>
              <div className="form-grid">
                {field("title", "SEO title", "text", "seo")}
                {field("h1", "H1 override", "text", "seo")}
                {field("primaryKeyword", "Primary keyword", "text", "seo")}
                {field("searchIntent", "Search intent", "text", "seo")}
                {field("targetCountry", "Target country", "text", "seo")}
                {field("canonical", "Canonical URL", "url", "seo")}
              </div>
              {field("description", "Meta description", "textarea", "seo")}
              {field(
                "secondaryKeywords",
                "Secondary keywords (one per line)",
                "lines",
                "seo",
              )}
              {field("noindex", "Noindex", "check", "seo")}
              {field("nofollow", "Nofollow", "check", "seo")}
              {field("ogTitle", "Open Graph title", "text", "seo")}
              {field(
                "ogDescription",
                "Open Graph description",
                "textarea",
                "seo",
              )}
              {field("ogImage", "Open Graph image URL", "text", "seo")}
            </>
          )}
          {tab === "Answers & entities" && (
            <>
              {field("entity", "Primary entity", "text", "aeo")}
              {field("directAnswer", "Direct answer", "textarea", "aeo")}
              {field(
                "takeaways",
                "Key takeaways (one per line)",
                "lines",
                "aeo",
              )}
              {field(
                "semanticTerms",
                "Semantic terms (one per line)",
                "lines",
                "aeo",
              )}
              {field("whoFor", "Who is this for?", "textarea", "aeo")}
              {field(
                "importantFacts",
                "Important facts (one per line)",
                "lines",
                "aeo",
              )}
              {field(
                "comparisonSummary",
                "Comparison summary",
                "textarea",
                "aeo",
              )}
              <JsonEditor
                label="Common questions"
                value={(data.aeo as Data).faqs}
                onChange={(v) => child("aeo", "faqs", v)}
                hint='[{"question":"...","answer":"..."}]'
              />
            </>
          )}
          {tab === "Relationships" && (
            <>
              {select(
                "productIds",
                "Recommended products",
                options.products,
                true,
              )}
              {select(
                "categoryIds",
                "Related categories",
                options.categories,
                true,
              )}
              {select(
                "relatedContentIds",
                "Related content",
                options.content,
                true,
              )}
              <p className="notice">
                Product blocks reference existing product records. Affiliate
                URLs stay in one place.
              </p>
            </>
          )}
          {tab === "Medical review" && (
            <>
              {select(
                "reviewerId",
                "Veterinary reviewer",
                options.authors.filter((a) => a.type === "Veterinary Reviewer"),
              )}
              {field("reviewedAt", "Review date", "date")}
              {field("emergencyWarning", "Emergency warning", "textarea")}
              {field("disclaimer", "Veterinary disclaimer", "textarea")}
              <p className="notice">
                Reviewed or published health content requires an author,
                qualified reviewer profile, review date, sources, and
                disclaimer. Only enter verified qualifications.
              </p>
            </>
          )}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-actions">
          <button className="button" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
          {id && !["homepage", "settings", "users"].includes(resource) && (
            <button
              type="button"
              className="button danger"
              onClick={async () => {
                if (!confirm("Delete this record? This cannot be undone."))
                  return;
                const r = await fetch("/api/admin/" + resource + "/" + id, {
                  method: "DELETE",
                });
                const v = await r.json();
                if (!r.ok) setError(v.error);
                else {
                  router.push("/admin/" + resource);
                  router.refresh();
                }
              }}
            >
              Delete record
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
function MediaPicker({
  options,
  onSelect,
}: {
  options: Option[];
  onSelect: (url: string) => void;
}) {
  return (
    <label>
      Reuse library image
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onSelect(e.target.value);
        }}
      >
        <option value="">Choose an image</option>
        {options.map((o) => (
          <option key={o.id} value={o.url}>
            {o.url}
          </option>
        ))}
      </select>
    </label>
  );
}
function JsonEditor({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: unknown;
  onChange: (v: unknown) => void;
  hint: string;
}) {
  const [raw, setRaw] = useState(JSON.stringify(value, null, 2)),
    [error, setError] = useState("");
  return (
    <label>
      {label}
      <textarea
        className="code-field"
        aria-label={label}
        rows={5}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            e.target.setCustomValidity("");
            setError("");
          } catch {
            e.target.setCustomValidity("Invalid JSON");
            setError("Invalid JSON — fix this field before saving.");
          }
        }}
      />
      <small>{error || hint}</small>
    </label>
  );
}
function SpecializedFields({
  value,
  onChange,
  fields,
}: {
  value: Data;
  onChange: (v: Data) => void;
  fields: string[];
}) {
  return (
    <fieldset>
      <legend>Specialized profile</legend>
      <div className="form-grid">
        {fields.map((k) => (
          <label key={k}>
            {k.replace(/([A-Z])/g, " $1")}
            <textarea
              value={String(value[k] ?? "")}
              rows={2}
              onChange={(e) => onChange({ ...value, [k]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function BlockEditor({
  value,
  onChange,
  products,
}: {
  value: Block[];
  onChange: (v: Block[]) => void;
  products: Option[];
}) {
  const [type, setType] = useState<Block["type"]>("paragraph");
  function update(i: number, v: Partial<Block>) {
    onChange(value.map((b, j) => (j === i ? { ...b, ...v } : b)));
  }
  return (
    <fieldset className="block-editor">
      <legend>Structured content</legend>
      <p className="muted">
        Use headings, prose, comparisons, and product references. HTML is not
        executed.
      </p>
      {value.map((b, i) => (
        <div className="content-block-editor" key={i}>
          <div className="block-toolbar">
            <strong>
              {i + 1}. {b.type}
            </strong>
            <div>
              <button
                type="button"
                disabled={!i}
                onClick={() => {
                  const next = [...value];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }}
              >
                ↑ Move
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          </div>
          {!["product", "comparison", "table", "image", "list"].includes(
            b.type,
          ) && (
            <textarea
              aria-label={b.type + " content"}
              value={b.text || ""}
              onChange={(e) => update(i, { text: e.target.value })}
            />
          )}{" "}
          {b.type === "list" && (
            <textarea
              aria-label="List items"
              value={b.items?.join("\n") || ""}
              onChange={(e) => update(i, { items: e.target.value.split("\n") })}
            />
          )}{" "}
          {b.type === "table" && (
            <textarea
              aria-label="Table rows, pipe-separated columns"
              value={b.rows?.map((r) => r.join(" | ")).join("\n") || ""}
              onChange={(e) =>
                update(i, {
                  rows: e.target.value
                    .split("\n")
                    .map((r) => r.split("|").map((c) => c.trim())),
                })
              }
            />
          )}{" "}
          {["image", "link"].includes(b.type) && (
            <label>
              URL
              <input
                value={b.url || ""}
                onChange={(e) => update(i, { url: e.target.value })}
              />
            </label>
          )}
          {b.type === "image" && (
            <label>
              Alternative text
              <input
                value={b.alt || ""}
                onChange={(e) => update(i, { alt: e.target.value })}
              />
            </label>
          )}
          {b.type === "product" && (
            <>
              <label>
                Product
                <select
                  value={b.productId || ""}
                  onChange={(e) => update(i, { productId: e.target.value })}
                >
                  <option value="">Choose a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Label (Top pick, Best value, etc.)
                <input
                  value={b.label || ""}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
              </label>
            </>
          )}
          {b.type === "comparison" && (
            <label>
              Compare products
              <select
                multiple
                value={b.productIds || []}
                onChange={(e) =>
                  update(i, {
                    productIds: Array.from(
                      e.target.selectedOptions,
                      (o) => o.value,
                    ),
                  })
                }
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      ))}
      <div className="block-add">
        <select
          aria-label="Block type"
          value={type}
          onChange={(e) => setType(e.target.value as Block["type"])}
        >
          {[
            "paragraph",
            "h2",
            "h3",
            "list",
            "table",
            "quote",
            "callout",
            "image",
            "link",
            "product",
            "comparison",
          ].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <button
          type="button"
          className="button secondary"
          onClick={() => onChange([...value, { type, text: "" }])}
        >
          + Add block
        </button>
      </div>
    </fieldset>
  );
}
