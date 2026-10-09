import type { AmazonItem, ImportRule } from "@/lib/amazon/types";
import { mockCategoryPath } from "@/lib/amazon/mock-categories";
type Fixture = {
  title: string;
  image: string | null;
  paths: string[];
  node: string;
};
const photo = (name: string) => `/images/retail/${name}.webp`;
const dog = (
  title: string,
  image: string | null,
  keys: string[],
  node: string,
): Fixture => ({
  title: "Dog " + title,
  image,
  paths: ["/dogs", ...keys.map((k) => "/dogs/" + k)],
  node: "Dog " + node,
});
const harness = dog(
  "Walking Harness",
  photo("harness"),
  ["harnesses", "walking-harnesses"],
  "Walking Harnesses",
);
const noPull = dog(
  "No-Pull Harness",
  photo("harness"),
  ["harnesses", "no-pull-harnesses"],
  "No-Pull Harnesses",
);
const carHarness = dog(
  "Car Harness",
  photo("harness"),
  ["harnesses", "car-harnesses", "car-safety"],
  "Car Harnesses",
);
const socks = dog(
  "Non-Slip Paw Socks",
  photo("socks"),
  ["paw-protection", "socks", "non-slip-socks"],
  "Paw Protection Socks",
);
const balm = dog(
  "Paw Balm",
  photo("balm"),
  ["paw-protection", "paw-balm"],
  "Paw Protection Balm",
);
const boots = dog(
  "Paw Boots",
  null,
  ["paw-protection", "paw-boots"],
  "Paw Protection Boots",
);
const pads = dog(
  "Protective Paw Pads",
  null,
  ["paw-protection", "paw-pads"],
  "Paw Protection Pads",
);
const wax = dog(
  "Paw Wax",
  null,
  ["paw-protection", "paw-wax"],
  "Paw Protection Wax",
);
const leash = dog(
  "Rope Walking Gear Leash",
  photo("leash"),
  ["leashes"],
  "Walking Gear Leashes",
);
const hoodie: Fixture = dog(
  "Warm Hoodie",
  photo("hoodie"),
  ["clothing", "hoodies"],
  "Clothing Hoodies",
);
// Clothing has a nested storefront path; both keys refer to the same real fixture type.
hoodie.paths.push("/dogs/clothing/hoodies");
const mat = dog(
  "Car Travel Mat",
  photo("mat"),
  ["car-safety"],
  "Car Safety Travel Mats",
);
const seatBelt = dog(
  "Car Seat Belt",
  null,
  ["car-safety", "seat-belts"],
  "Car Safety Seat Belts",
);
const catPerch: Fixture = {
  title: "Cat Window Perch",
  image: photo("perch"),
  paths: ["/cats"],
  node: "Cat Perches",
};
const catWand: Fixture = {
  title: "Cat Play Wand",
  image: photo("wand"),
  paths: ["/cats"],
  node: "Cat Toys",
};
const standardLeash = dog(
  "Standard Leash",
  null,
  ["leashes"],
  "Standard Leashes",
);
const noPullLeash = dog("No-Pull Leash", null, ["leashes"], "No-Pull Leashes");
const jacket = dog(
  "Weatherproof Jacket",
  null,
  ["clothing", "jackets"],
  "Clothing Jackets",
);
const coat = dog("Winter Coat", null, ["clothing", "coats"], "Clothing Coats");
const restraint = dog(
  "Car Restraint",
  null,
  ["car-safety", "restraints"],
  "Car Safety Restraints",
);
const profiles: Record<string, Fixture[]> = {
  harnesses: [harness, noPull, carHarness],
  "walking-harnesses": [harness],
  "no-pull-harnesses": [noPull],
  "car-harnesses": [carHarness],
  leashes: [leash, standardLeash, noPullLeash],
  clothing: [hoodie, jacket, coat],
  hoodies: [hoodie],
  "paw-protection": [socks, balm, boots, pads, wax],
  socks: [socks],
  "non-slip-socks": [socks],
  "paw-balm": [balm],
  "paw-boots": [boots],
  "paw-pads": [pads],
  "paw-wax": [wax],
  "car-safety": [seatBelt, carHarness, restraint, mat],
  "seat-belts": [seatBelt],
  dogs: [harness, leash, hoodie, socks, balm, mat],
  cats: [catPerch, catWand],
};
/** Fictional catalog taxonomy is independent of the selected rule's terms/nodes.
 * Never rename arbitrary products or give them the selected category's browse ID.
 * Missing type-appropriate imagery remains null instead of borrowing a harness.
 */
export function mockItems(rule: ImportRule): AmazonItem[] {
  const path = mockCategoryPath(rule);
  if (!path) return [];
  const key = path.split("/").at(-1)!;
  const fixtures = profiles[key];
  if (!fixtures || path.startsWith("/cats/")) return [];
  const economic: (number | null)[][] = [
    [30, 0.05, 4.8, 2800, 15],
    [100, 0.03, 3.1, 12, 80000],
    [20, 0.03, 4.4, 400, 350],
    [null, null, null, null, null],
    [35, 0.04, 4.7, 1000, 80],
    [18, 0.06, 4.6, 1850, 45],
    [45, 0.02, 4.2, 630, 450],
    [12, 0.08, 4.9, 4500, 25],
    [65, 0.04, 3.8, 90, 12000],
    [28, 0.05, 4.5, 1700, 150],
    [9.5, 0.025, 4.1, 240, 700],
    [80, 0.07, 3.5, 35, 35000],
    [25, 0.045, 4.7, 2100, 60],
    [150, 0.01, 3.2, 8, 95000],
    [39, 0.035, 4.6, 900, 170],
    [16, 0.055, 4.3, 500, 420],
    [55, 0.03, 4.0, 160, 5000],
    [22, 0.065, 4.8, 3200, 40],
    [42, 0.04, 4.4, 750, 250],
    [33.9, 0.05, 4.2, 340, 880],
  ];
  const variants = [
    "Everyday",
    "Premium",
    "Budget",
    "Missing signals",
    "Comfort",
    "Trail",
    "Reflective",
    "Lightweight",
    "Heavy-Duty",
    "All-Season",
    "Compact",
    "Deluxe",
    "Soft-Fit",
    "Luxury",
    "Adventure",
    "Travel",
    "Adjustable",
    "Gentle",
    "Outdoor",
    "Classic",
  ];
  const availability = [
    "MOCK_IN_STOCK",
    "MOCK_IN_STOCK",
    "MOCK_LIMITED_STOCK",
    null,
    "MOCK_PREORDER",
    "MOCK_IN_STOCK",
    "MOCK_OUT_OF_STOCK",
  ];
  const code = Object.keys(profiles)
    .indexOf(key)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  function make(
    id: number,
    f: Fixture,
    values: (number | null)[],
    variant: string,
  ): AmazonItem {
    const [price, commissionRate, rating, reviewCount, salesRank] = values;
    const asin =
      key === "harnesses"
        ? `MOCK${String(id).padStart(6, "0")}`
        : `M${code}${String(id).padStart(5, "0")}`;
    return {
      asin,
      title: `Mock ${variant} ${f.title}`,
      brand: "Mock supplier (fictional)",
      image: f.image,
      images: f.image ? [f.image] : [],
      currency: "USD",
      availability: availability[(id - 1) % availability.length],
      marketplace: rule.marketplace,
      mock: true,
      mockCategoryPaths: [...f.paths],
      features: [
        ...(id % 3 === 0 ? ["reflective outdoor visibility"] : []),
        ...(id % 4 === 0 ? ["padded comfortable fit"] : []),
        ...(id % 5 === 0 ? ["lightweight travel design"] : []),
      ],
      commissionSource: "Simulated fixture commission; not an Amazon rate",
      commissionRate,
      price,
      rating,
      reviewCount,
      nodes: [
        {
          id: `MOCK-${f.node.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          name: f.node,
          salesRank,
        },
      ],
      productUrl: `https://example.com/mock/${asin}`,
      affiliateUrl: `https://example.com/mock/${asin}?affiliate=development`,
    };
  }
  if (key === "harnesses") {
    // Keep established fixture ASINs stable, including the excluded food sentinel
    // and approved related leash, while adding twenty actual harness products.
    return [
      make(1, harness, economic[0], variants[0]),
      make(2, harness, economic[1], variants[1]),
      make(3, harness, economic[2], variants[2]),
      make(4, harness, economic[3], variants[3]),
      make(
        5,
        dog("Food", null, ["food"], "Food"),
        [300, 0.15, 4.9, 10000, 1],
        "Expensive",
      ),
      make(6, leash, [22, 0.04, 4.3, 800, 100], "Reflective"),
      make(7, noPull, economic[4], variants[4]),
      ...Array.from({ length: 15 }, (_, i) =>
        make(
          i + 8,
          fixtures[(i + 2) % fixtures.length],
          economic[i + 5],
          variants[i + 5],
        ),
      ),
    ];
  }
  return Array.from({ length: 20 }, (_, i) =>
    make(i + 1, fixtures[i % fixtures.length], economic[i], variants[i]),
  );
}
