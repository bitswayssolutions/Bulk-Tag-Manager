export default function Support() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Support — Bulk Tag Manager</title>
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
          .subtitle { color: #888; font-size: 1rem; margin-bottom: 40px; }
          a { color: #008060; }
          .card {
            border: 1px solid #e1e3e5;
            border-radius: 8px;
            padding: 24px;
            margin-top: 16px;
          }
          .card h3 { margin: 0 0 8px; font-size: 1rem; }
          .card p { margin: 0; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>Support</h1>
          <p className="subtitle">Bulk Tag Manager — we're here to help</p>

          <h2>Contact us</h2>
          <div className="card">
            <h3>Email support</h3>
            <p>
              Send us an email at{" "}
              <a href="mailto:bitswayssolutions@gmail.com">bitswayssolutions@gmail.com</a>{" "}
              and we'll get back to you within 1–2 business days.
            </p>
          </div>

          <h2>Frequently asked questions</h2>

          <div className="card">
            <h3>How do I bulk add tags to products?</h3>
            <p>
              Go to <strong>Products</strong>, use the filters to narrow down your selection,
              check the products you want to update, then click <strong>Add Tags</strong>.
              Enter your tags (comma-separated) and confirm.
            </p>
          </div>

          <div className="card">
            <h3>What is the difference between Remove Tags and Replace All Tags?</h3>
            <p>
              <strong>Remove Tags</strong> removes only the specific tags you enter, leaving
              all other tags intact. <strong>Replace All Tags</strong> removes every existing
              tag on the selected items and replaces them with the new tags you provide.
            </p>
          </div>

          <div className="card">
            <h3>How many products can I update at once?</h3>
            <p>
              You can select all products shown on the current page. The app processes
              mutations in batches of 10 to stay within Shopify API rate limits.
            </p>
          </div>

          <div className="card">
            <h3>Can I tag orders and collections too?</h3>
            <p>
              Yes. Use the <strong>Orders</strong> section to bulk tag orders, and the{" "}
              <strong>Collections</strong> section to navigate collections and manage
              tags on all products within a collection.
            </p>
          </div>

          <div className="card">
            <h3>Why can't I see my products after applying a filter?</h3>
            <p>
              Make sure the filter values match exactly what's in your store (e.g. vendor
              name casing). You can clear all filters using the <strong>Clear</strong> button
              to start fresh.
            </p>
          </div>

          <h2>Privacy</h2>
          <p>
            Read our <a href="/privacy">Privacy Policy</a> to understand what data
            the app collects and how it's used.
          </p>
        </div>
      </body>
    </html>
  );
}
