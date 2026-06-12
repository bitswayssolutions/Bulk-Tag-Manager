import { useState, useEffect, useRef } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useNavigate, useRouteError, useRevalidator } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

// ─── Types ───────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  title: string;
  vendor: string;
  productType: string;
  tags: string[];
};

type Collection = { id: string; title: string };

type Filters = {
  collection: string | null;
  vendor: string | null;
  productType: string | null;
  tag: string | null;
  query: string | null;
  after: string | null;
};

type LoaderData = {
  products: Product[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  collections: Collection[];
  vendors: string[];
  productTypes: string[];
  filters: Filters;
};

type ActionData = { success: boolean; errorCount: number };

type ProductsResponse = {
  data: {
    products?: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: Array<{ node: Product }>;
    };
    collection?: {
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{ node: Product }>;
      };
    };
  };
};

type FilterOptionsResponse = {
  data: {
    collections: { edges: Array<{ node: Collection }> };
    productVendors: { edges: Array<{ node: string }> };
    productTypes: { edges: Array<{ node: string }> };
  };
};

type TagMutationResponse = {
  data: {
    tagsAdd?: { userErrors: Array<{ field: string; message: string }> };
    tagsRemove?: { userErrors: Array<{ field: string; message: string }> };
  };
};

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_PRODUCTS = `#graphql
  query GetProducts($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      pageInfo { hasNextPage endCursor }
      edges { node { id title vendor productType tags } }
    }
  }`;

const GET_COLLECTION_PRODUCTS = `#graphql
  query GetCollectionProducts($id: ID!, $first: Int!, $after: String) {
    collection(id: $id) {
      products(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges { node { id title vendor productType tags } }
      }
    }
  }`;

const GET_FILTER_OPTIONS = `#graphql
  query GetFilterOptions($first: Int!) {
    collections(first: $first) {
      edges { node { id title } }
    }
    productVendors(first: 250) { edges { node } }
    productTypes(first: 250) { edges { node } }
  }`;

const TAGS_ADD = `#graphql
  mutation TagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node { id }
      userErrors { field message }
    }
  }`;

const TAGS_REMOVE = `#graphql
  mutation TagsRemove($id: ID!, $tags: [String!]!) {
    tagsRemove(id: $id, tags: $tags) {
      node { id }
      userErrors { field message }
    }
  }`;

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  const rawCollection = url.searchParams.get("collection");
  const collectionId = rawCollection?.startsWith("gid://shopify/Collection/") ? rawCollection : null;
  const vendor = url.searchParams.get("vendor") || null;
  const productType = url.searchParams.get("productType") || null;
  const tag = url.searchParams.get("tag") || null;
  const titleQuery = url.searchParams.get("query") || null;
  const after = url.searchParams.get("after") || null;

  const queryParts: string[] = [];
  if (vendor) queryParts.push(`vendor:${vendor}`);
  if (productType) queryParts.push(`product_type:${productType}`);
  if (tag) queryParts.push(`tag:${tag}`);
  if (titleQuery) queryParts.push(`title:${titleQuery}*`);
  const searchQuery = queryParts.length > 0 ? queryParts.join(" ") : undefined;

  const [productsRes, filterRes] = await Promise.all([
    collectionId
      ? admin.graphql(GET_COLLECTION_PRODUCTS, { variables: { id: collectionId, first: 50, after } })
      : admin.graphql(GET_PRODUCTS, { variables: { first: 50, after, query: searchQuery } }),
    admin.graphql(GET_FILTER_OPTIONS, { variables: { first: 250 } }),
  ]);

  const productsJson = (await productsRes.json()) as ProductsResponse;
  const filterJson = (await filterRes.json()) as FilterOptionsResponse;

  const productConn = collectionId
    ? productsJson.data?.collection?.products
    : productsJson.data?.products;

  return {
    products: (productConn?.edges ?? []).map((e) => e.node),
    pageInfo: productConn?.pageInfo ?? { hasNextPage: false, endCursor: null },
    collections: (filterJson.data?.collections?.edges ?? []).map((e) => e.node),
    vendors: (filterJson.data?.productVendors?.edges ?? []).map((e) => e.node),
    productTypes: (filterJson.data?.productTypes?.edges ?? []).map((e) => e.node),
    filters: { collection: collectionId, vendor, productType, tag, query: titleQuery, after },
  } satisfies LoaderData;
};

// ─── Action ──────────────────────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const intent = formData.get("intent") as "add" | "remove" | "replace";
  const productIds = JSON.parse(formData.get("productIds") as string) as string[];
  const tags = (formData.get("tags") as string)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  let errorCount = 0;

  const runMutation = async (
    mutation: string,
    ids: string[],
    tagsForId: (id: string) => string[],
  ) => {
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const responses = await Promise.all(
        chunk.map((id) => admin.graphql(mutation, { variables: { id, tags: tagsForId(id) } })),
      );
      const jsons = (await Promise.all(
        responses.map((r) => r.json()),
      )) as TagMutationResponse[];
      for (const json of jsons) {
        const errs =
          json.data?.tagsAdd?.userErrors ?? json.data?.tagsRemove?.userErrors ?? [];
        errorCount += errs.length;
      }
    }
  };

  if (intent === "add") {
    await runMutation(TAGS_ADD, productIds, () => tags);
  } else if (intent === "remove") {
    await runMutation(TAGS_REMOVE, productIds, () => tags);
  } else {
    // replace: remove all current tags, then add new ones
    const currentTagsMap = JSON.parse(
      formData.get("currentTags") as string,
    ) as Record<string, string[]>;
    await runMutation(TAGS_REMOVE, productIds, (id) => currentTagsMap[id] ?? []);
    await runMutation(TAGS_ADD, productIds, () => tags);
  }

  return { success: errorCount === 0, errorCount } satisfies ActionData;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Products() {
  const { products, pageInfo, collections, vendors, productTypes, filters } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Local state for text filter fields (applied on button click)
  const [localQuery, setLocalQuery] = useState(filters.query ?? "");
  const [localTag, setLocalTag] = useState(filters.tag ?? "");

  const wasSubmitting = useRef(false);
  const isSubmitting = fetcher.state === "submitting";

  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.includes(p.id));
  const hasFilters =
    filters.collection || filters.vendor || filters.productType || filters.tag || filters.query;

  // Detect action completion and show toast
  useEffect(() => {
    if (fetcher.state === "submitting") {
      wasSubmitting.current = true;
    }
    if (fetcher.state === "idle" && wasSubmitting.current && fetcher.data !== undefined) {
      wasSubmitting.current = false;
      if (fetcher.data.success) {
        shopify.toast.show("Tags updated");
        setSelectedIds([]);
        setTagInput("");
        revalidator.revalidate();
      } else {
        shopify.toast.show(`${fetcher.data.errorCount} error(s) occurred`, { isError: true });
      }
    }
  }, [fetcher.state, fetcher.data]);

  // Reset local text fields when loader filters change (e.g. after clear)
  useEffect(() => {
    setLocalQuery(filters.query ?? "");
    setLocalTag(filters.tag ?? "");
    setSelectedIds([]);
  }, [filters.query, filters.tag, filters.collection, filters.vendor, filters.productType]);

  const applyFilter = (updates: Partial<Record<keyof Filters, string | null>>) => {
    const merged: Record<string, string | null | undefined> = {
      collection: filters.collection,
      vendor: filters.vendor,
      productType: filters.productType,
      tag: filters.tag,
      query: filters.query,
      ...updates,
    };
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(merged)) {
      if (val) params.set(key, val);
    }
    const search = params.toString();
    navigate(`/app/products${search ? `?${search}` : ""}`);
  };

  const applyTextFilters = () => {
    applyFilter({ query: localQuery || null, tag: localTag || null });
  };

  const clearFilters = () => {
    setLocalQuery("");
    setLocalTag("");
    navigate("/app/products");
  };

  const submitTagOperation = (intent: "add" | "remove" | "replace") => {
    const currentTags: Record<string, string[]> = {};
    for (const p of products) currentTags[p.id] = p.tags;
    fetcher.submit(
      {
        intent,
        productIds: JSON.stringify(selectedIds),
        tags: tagInput,
        currentTags: JSON.stringify(currentTags),
      },
      { method: "POST" },
    );
  };

  const loadNextPage = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("after", pageInfo.endCursor ?? "");
    navigate(url.pathname + url.search);
  };

  return (
    <s-page heading="Products">
      {/* Filter bar */}
      <s-section heading="Filters">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-search-field
              label="Title"
              placeholder="Search products"
              labelAccessibilityVisibility="exclusive"
              value={localQuery}
              onInput={(e: Event) =>
                setLocalQuery((e.target as HTMLInputElement).value)
              }
            />
            <s-text-field
              label="Tag"
              placeholder="Filter by tag"
              labelAccessibilityVisibility="exclusive"
              value={localTag}
              onInput={(e: Event) =>
                setLocalTag((e.target as HTMLInputElement).value)
              }
            />
            <s-select
              label="Collection"
              value={filters.collection ?? ""}
              onChange={(e: Event) =>
                applyFilter({ collection: (e.target as HTMLSelectElement).value || null })
              }
            >
              <s-option value="">All collections</s-option>
              {collections.map((c) => (
                <s-option key={c.id} value={c.id}>
                  {c.title}
                </s-option>
              ))}
            </s-select>
            <s-select
              label="Vendor"
              value={filters.vendor ?? ""}
              onChange={(e: Event) =>
                applyFilter({ vendor: (e.target as HTMLSelectElement).value || null })
              }
            >
              <s-option value="">All vendors</s-option>
              {vendors.map((v) => (
                <s-option key={v} value={v}>
                  {v}
                </s-option>
              ))}
            </s-select>
            <s-select
              label="Product type"
              value={filters.productType ?? ""}
              onChange={(e: Event) =>
                applyFilter({ productType: (e.target as HTMLSelectElement).value || null })
              }
            >
              <s-option value="">All types</s-option>
              {productTypes.map((pt) => (
                <s-option key={pt} value={pt}>
                  {pt}
                </s-option>
              ))}
            </s-select>
          </s-stack>
          <s-stack direction="inline" gap="base">
            <s-button onClick={applyTextFilters}>Apply filters</s-button>
            {hasFilters && (
              <s-button variant="tertiary" onClick={clearFilters}>
                Clear
              </s-button>
            )}
          </s-stack>
        </s-stack>
      </s-section>

      {/* Bulk action bar — visible when products are selected */}
      {selectedIds.length > 0 && (
        <s-section>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-text>
              {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""} selected
            </s-text>
            <s-button commandFor="modal-add">Add Tags</s-button>
            <s-button commandFor="modal-remove">Remove Tags</s-button>
            <s-button commandFor="modal-replace" tone="critical">
              Replace All Tags
            </s-button>
          </s-stack>
        </s-section>
      )}

      {/* Product table */}
      <s-section>
        {products.length === 0 ? (
          <s-paragraph>
            No products found.{" "}
            {hasFilters ? "Try adjusting your filters." : "Add products to your store to get started."}
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot="primary">
                  <s-checkbox
                    label="Title"
                    checked={allSelected}
                    onChange={() =>
                      setSelectedIds(allSelected ? [] : products.map((p) => p.id))
                    }
                  />
                </s-table-header>
                <s-table-header listSlot="labeled">Vendor</s-table-header>
                <s-table-header listSlot="labeled">Type</s-table-header>
                <s-table-header listSlot="labeled">Tags</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {products.map((product) => (
                  <s-table-row key={product.id}>
                    <s-table-cell>
                      <s-checkbox
                        label={product.title}
                        checked={selectedIds.includes(product.id)}
                        onChange={() =>
                          setSelectedIds((prev) =>
                            prev.includes(product.id)
                              ? prev.filter((id) => id !== product.id)
                              : [...prev, product.id],
                          )
                        }
                      />
                    </s-table-cell>
                    <s-table-cell>{product.vendor || "—"}</s-table-cell>
                    <s-table-cell>{product.productType || "—"}</s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="base">
                        {product.tags.length > 0
                          ? product.tags.map((t) => <s-chip key={t}>{t}</s-chip>)
                          : <s-text tone="neutral">No tags</s-text>}
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>

            {pageInfo.hasNextPage && (
              <s-button variant="tertiary" onClick={loadNextPage}>
                Load more products
              </s-button>
            )}
          </s-stack>
        )}
      </s-section>

      {/* Add Tags Modal */}
      <s-modal id="modal-add" heading="Add Tags">
        <s-stack direction="block" gap="base">
          <s-text>
            Add tags to {selectedIds.length} selected product
            {selectedIds.length !== 1 ? "s" : ""}.
          </s-text>
          <s-text-field
            label="Tags (comma-separated)"
            placeholder="summer, sale, new-arrival"
            value={tagInput}
            onInput={(e: Event) => setTagInput((e.target as HTMLInputElement).value)}
          />
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          {...(isSubmitting ? { loading: true } : {})}
          onClick={() => submitTagOperation("add")}
        >
          Add Tags
        </s-button>
        <s-button slot="secondary-actions" variant="secondary" commandFor="modal-add" command="--hide">
          Cancel
        </s-button>
      </s-modal>

      {/* Remove Tags Modal */}
      <s-modal id="modal-remove" heading="Remove Tags">
        <s-stack direction="block" gap="base">
          <s-text>
            Remove tags from {selectedIds.length} selected product
            {selectedIds.length !== 1 ? "s" : ""}.
          </s-text>
          <s-text-field
            label="Tags to remove (comma-separated)"
            placeholder="summer, sale, new-arrival"
            value={tagInput}
            onInput={(e: Event) => setTagInput((e.target as HTMLInputElement).value)}
          />
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          {...(isSubmitting ? { loading: true } : {})}
          onClick={() => submitTagOperation("remove")}
        >
          Remove Tags
        </s-button>
        <s-button slot="secondary-actions" variant="secondary" commandFor="modal-remove" command="--hide">
          Cancel
        </s-button>
      </s-modal>

      {/* Replace Tags Modal */}
      <s-modal id="modal-replace" heading="Replace All Tags">
        <s-stack direction="block" gap="base">
          <s-text>
            Replace all existing tags on {selectedIds.length} selected product
            {selectedIds.length !== 1 ? "s" : ""}. Current tags will be removed
            and replaced with the tags you enter below.
          </s-text>
          <s-text-field
            label="New tags (comma-separated)"
            placeholder="summer, sale, new-arrival"
            value={tagInput}
            onInput={(e: Event) => setTagInput((e.target as HTMLInputElement).value)}
          />
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          {...(isSubmitting ? { loading: true } : {})}
          onClick={() => submitTagOperation("replace")}
        >
          Replace Tags
        </s-button>
        <s-button slot="secondary-actions" variant="secondary" commandFor="modal-replace" command="--hide">
          Cancel
        </s-button>
      </s-modal>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
