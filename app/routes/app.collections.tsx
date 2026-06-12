import { useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

// ─── Types ───────────────────────────────────────────────────────────────────

type Collection = {
  id: string;
  title: string;
  handle: string;
  productsCount: { count: number };
};

type Filters = {
  query: string | null;
  after: string | null;
};

type LoaderData = {
  collections: Collection[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  filters: Filters;
};

type CollectionsResponse = {
  data: {
    collections: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: Array<{ node: Collection }>;
    };
  };
};

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_COLLECTIONS = `#graphql
  query GetCollections($first: Int!, $after: String, $query: String) {
    collections(first: $first, after: $after, query: $query) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          title
          handle
          productsCount { count }
        }
      }
    }
  }`;

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  const titleQuery = url.searchParams.get("query");
  const after = url.searchParams.get("after");

  const searchQuery = titleQuery ? `title:${titleQuery}*` : undefined;

  const res = await admin.graphql(GET_COLLECTIONS, {
    variables: { first: 50, after, query: searchQuery },
  });

  const json = (await res.json()) as CollectionsResponse;
  const conn = json.data?.collections;

  return {
    collections: (conn?.edges ?? []).map((e) => e.node),
    pageInfo: conn?.pageInfo ?? { hasNextPage: false, endCursor: null },
    filters: { query: titleQuery, after },
  } satisfies LoaderData;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Collections() {
  const { collections, pageInfo, filters } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [localQuery, setLocalQuery] = useState(filters.query ?? "");

  const applySearch = (query: string | null) => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("query", query);
    else url.searchParams.delete("query");
    url.searchParams.delete("after");
    navigate(url.pathname + url.search);
  };

  const loadNextPage = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("after", pageInfo.endCursor ?? "");
    navigate(url.pathname + url.search);
  };

  return (
    <s-page heading="Collections">
      <s-section>
        <s-paragraph>
          Select a collection to manage tags on all products within it.
        </s-paragraph>
      </s-section>

      <s-section heading="Search">
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-search-field
            label="Collection title"
            placeholder="Search collections"
            labelAccessibilityVisibility="exclusive"
            value={localQuery}
            onInput={(e: Event) =>
              setLocalQuery((e.target as HTMLInputElement).value)
            }
          />
          <s-button onClick={() => applySearch(localQuery || null)}>
            Apply
          </s-button>
          {filters.query && (
            <s-button
              variant="tertiary"
              onClick={() => {
                setLocalQuery("");
                applySearch(null);
              }}
            >
              Clear
            </s-button>
          )}
        </s-stack>
      </s-section>

      <s-section>
        {collections.length === 0 ? (
          <s-paragraph>
            No collections found.{" "}
            {filters.query
              ? "Try adjusting your search."
              : "Add collections to your store to get started."}
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot="primary">Title</s-table-header>
                <s-table-header listSlot="labeled">Products</s-table-header>
                <s-table-header listSlot="labeled">Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {collections.map((collection) => (
                  <s-table-row key={collection.id}>
                    <s-table-cell>
                      <s-text>{collection.title}</s-text>
                    </s-table-cell>
                    <s-table-cell>
                      <s-text>{collection.productsCount.count}</s-text>
                    </s-table-cell>
                    <s-table-cell>
                      <s-button
                        onClick={() =>
                          navigate(
                            `/app/products?collection=${encodeURIComponent(collection.id)}`,
                          )
                        }
                      >
                        Manage product tags
                      </s-button>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>

            {pageInfo.hasNextPage && (
              <s-button variant="tertiary" onClick={loadNextPage}>
                Load more collections
              </s-button>
            )}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
