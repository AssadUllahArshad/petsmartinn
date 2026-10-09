import { expireAmazonCache } from "../services/amazon/cache";
import { db } from "../lib/db";
try {
  await expireAmazonCache();
  console.log("Expired Amazon catalog cache cleared.");
} finally {
  await db.$disconnect();
}
