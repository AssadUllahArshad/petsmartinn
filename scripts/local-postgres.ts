import EmbeddedPostgres from "embedded-postgres";
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
async function main() {
  const directory = "/private/tmp/petsmartinn-postgres";
  const password =
    process.env.LOCAL_DB_PASSWORD ||
    (existsSync("/private/tmp/petsmartinn-local-db-url")
      ? new URL(readFileSync("/private/tmp/petsmartinn-local-db-url", "utf8"))
          .password
      : randomBytes(24).toString("hex"));
  const pg = new EmbeddedPostgres({
    databaseDir: directory,
    user: "postgres",
    password,
    port: 55432,
    persistent: true,
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => {},
    onError: (message) => console.error(String(message)),
  });
  if (!existsSync(directory + "/PG_VERSION")) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  const found = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = 'petsmartinn'",
  );
  if (!found.rows.length) await pg.createDatabase("petsmartinn");
  await client.end();
  await writeFile(
    "/private/tmp/petsmartinn-local-db-url",
    `postgresql://postgres:${password}@127.0.0.1:55432/petsmartinn`,
    { mode: 0o600 },
  );
  console.log("Isolated development PostgreSQL started on localhost:55432.");
  async function stop() {
    await pg.stop();
    process.exit(0);
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => {}, 30000);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
