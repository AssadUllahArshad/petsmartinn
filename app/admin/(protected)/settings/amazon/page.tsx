import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { publicAmazonConfig, credentialKeys } from "@/services/amazon/config";
import "../../amazon/amazon.css";
export default async function Page() {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") redirect("/admin");
  const c = publicAmazonConfig();
  return (
    <div className="amazon-admin">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">Amazon · Connection</span>
          <h1>Amazon settings</h1>
          <p>
            Credentials stay on the server. Configure them in your deployment
            environment or ignored local .env file.
          </p>
        </div>
      </div>
      <section className="amazon-search-panel">
        <h2>Connection status</h2>
        <dl className="amazon-facts">
          <div>
            <dt>Mode</dt>
            <dd>
              {c.mock ? "Mock — fictional test fixtures" : "Live Creators API"}
            </dd>
          </div>
          <div>
            <dt>Marketplace</dt>
            <dd>{c.marketplace}</dd>
          </div>
          <div>
            <dt>Live credentials</dt>
            <dd>{c.configured ? "Configured" : "Not fully configured"}</dd>
          </div>
          <div>
            <dt>Credential version</dt>
            <dd>
              {c.versionSupported ? "Supported" : "Missing or unsupported"}
            </dd>
          </div>
          <div>
            <dt>Analysis approval confirmed</dt>
            <dd>
              {c.analysisApproved ? "Confirmed by operator" : "Not confirmed"}
            </dd>
          </div>
        </dl>
        <ul>
          {credentialKeys.map((key) => (
            <li key={key}>
              <code>{key}</code>:{" "}
              {c.missing.includes(key) ? "Missing" : "Set (value hidden)"}
            </li>
          ))}
        </ul>
      </section>
      <section className="amazon-search-panel">
        <h2>Enable live search</h2>
        <p>
          Obtain Creators API access and credentials from Amazon Associates. Set
          the five server variables above. Credential versions 3.1, 3.2 and 3.3
          use Amazon’s US, European and Far East OAuth endpoints respectively.
          Use the version issued with your credentials and your authorized
          marketplace and partner tag.
        </p>
        <p>
          <a
            href="https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl"
            target="_blank"
            rel="noopener noreferrer"
          >
            Official Creators API setup
          </a>
        </p>
        <p>
          Amazon’s Program Content license requires prior written approval for
          aggregating or analyzing its content. Confirm that your account’s
          approval covers this ranking use before setting{" "}
          <code>AMAZON_ANALYSIS_APPROVED=true</code>. Live ranking stays
          disabled until that operator confirmation.
        </p>
        <p>
          <a
            href="https://affiliate-program.amazon.com/help/operating/policies/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Amazon operating policies and content license
          </a>
        </p>
        <p>
          Set <code>AMAZON_USE_MOCK_DATA=false</code> for live use. Mock mode is
          enabled only by <code>AMAZON_USE_MOCK_DATA=true</code>; it never falls
          back silently when the API fails. Mock imports remain drafts and
          cannot be published.
        </p>
      </section>
      <section className="amazon-search-panel">
        <h2>Catalog and commission rules</h2>
        <p>
          Only returned values are used. Missing price, availability, rating,
          review or commission data stays unknown. Creators API does not provide
          a commission resource; configure a verified rate, source and validity
          dates in import rules.
        </p>
        <p>
          Estimated Opportunity is a heuristic, not guaranteed earnings. Future
          authorized performance fields include clicks, outbound CTR, observed
          conversion, observed earnings and earnings per click. No values are
          synthesized.
        </p>
        <p>
          Live Amazon content expires after 24 hours. Run{" "}
          <code>npm run amazon:expire</code> regularly as a maintenance job and
          sync imports before publishing. Images are linked directly, never
          downloaded or cached by the image optimizer. Manual editorial and SEO
          content remains yours.
        </p>
      </section>
    </div>
  );
}
