export default function Privacy() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Privacy Policy — Bulk Tag Manager</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1a1a1a;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 720px;
            margin: 0 auto;
            padding: 48px 24px;
          }
          h1 { font-size: 2rem; margin-bottom: 8px; }
          h2 { font-size: 1.25rem; margin-top: 40px; margin-bottom: 12px; }
          p, li { font-size: 1rem; line-height: 1.7; color: #333; }
          ul { padding-left: 24px; }
          .updated { color: #888; font-size: 0.9rem; margin-bottom: 40px; }
          a { color: #008060; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>Privacy Policy</h1>
          <p className="updated">Last updated: June 2026</p>

          <p>
            Bulk Tag Manager ("the App") is a Shopify embedded app that lets merchants
            bulk add, remove, and replace tags on products, collections, and orders.
            This policy explains what data we collect and how we use it.
          </p>

          <h2>Data we collect</h2>
          <p>
            The App stores only the OAuth access tokens issued by Shopify when a
            merchant installs the App. These tokens are used solely to authenticate
            requests to the Shopify Admin API on behalf of the merchant.
          </p>
          <p>
            We do not collect, store, or process any personal data about a merchant's
            customers. All product, order, and collection data is read directly from
            and written directly to Shopify — nothing is retained in our database.
          </p>

          <h2>How we use your data</h2>
          <ul>
            <li>OAuth tokens are used to authorise Shopify Admin API calls made by the App.</li>
            <li>No data is sold, shared, or used for advertising.</li>
            <li>No analytics or tracking services are embedded in the App.</li>
          </ul>

          <h2>Data storage</h2>
          <p>
            OAuth session tokens are stored in a PostgreSQL database hosted on
            Supabase (AWS us-east-2). Data is encrypted at rest and in transit.
            Sessions are deleted automatically when a merchant uninstalls the App.
          </p>

          <h2>Third-party services</h2>
          <ul>
            <li>
              <strong>Shopify</strong> — all merchant and store data lives in Shopify.
              See <a href="https://www.shopify.com/legal/privacy" target="_blank" rel="noreferrer">Shopify's Privacy Policy</a>.
            </li>
            <li>
              <strong>Vercel</strong> — the App is hosted on Vercel.
              See <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">Vercel's Privacy Policy</a>.
            </li>
            <li>
              <strong>Supabase</strong> — session database.
              See <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase's Privacy Policy</a>.
            </li>
          </ul>

          <h2>GDPR &amp; data requests</h2>
          <p>
            If you are a Shopify merchant and wish to request a copy of your data or
            request deletion, please contact us at the email below. Because we store
            only OAuth tokens (no customer personal data), customer data requests
            are handled by Shopify directly.
          </p>

          <h2>Contact</h2>
          <p>
            For any privacy-related questions, contact us at{" "}
            <a href="mailto:devkulvir@gmail.com">devkulvir@gmail.com</a>.
          </p>
        </div>
      </body>
    </html>
  );
}
