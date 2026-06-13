import { useState, useEffect, useRef } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useNavigate, useRouteError, useRevalidator } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

// ─── Types ───────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  name: string;
  tags: string[];
  displayFinancialStatus: string | null;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  customer: {
    displayName: string;
    defaultEmailAddress: { emailAddress: string } | null;
  } | null;
};

type Filters = {
  query: string | null;
  financialStatus: string | null;
  after: string | null;
};

type LoaderData = {
  orders: Order[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  filters: Filters;
};

type ActionData = { success: boolean; errorCount: number };

type OrdersResponse = {
  data: {
    orders: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: Array<{ node: Order }>;
    };
  };
};

type TagMutationResponse = {
  data: {
    tagsAdd?: { userErrors: Array<{ field: string; message: string }> };
    tagsRemove?: { userErrors: Array<{ field: string; message: string }> };
  };
};

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_ORDERS = `#graphql
  query GetOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          name
          tags
          displayFinancialStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          customer {
            displayName
            defaultEmailAddress { emailAddress }
          }
        }
      }
    }
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

const FINANCIAL_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "authorized", label: "Authorized" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "partially_refunded", label: "Partially refunded" },
  { value: "refunded", label: "Refunded" },
  { value: "voided", label: "Voided" },
];

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  const searchQuery = url.searchParams.get("query");
  const financialStatus = url.searchParams.get("financialStatus");
  const after = url.searchParams.get("after");

  const queryParts: string[] = [];
  if (searchQuery) queryParts.push(searchQuery);
  if (financialStatus) queryParts.push(`financial_status:${financialStatus}`);
  const combinedQuery = queryParts.length > 0 ? queryParts.join(" ") : undefined;

  const res = await admin.graphql(GET_ORDERS, {
    variables: { first: 50, after, query: combinedQuery },
  });

  const json = (await res.json()) as OrdersResponse;
  const conn = json.data?.orders;

  return {
    orders: (conn?.edges ?? []).map((e) => e.node),
    pageInfo: conn?.pageInfo ?? { hasNextPage: false, endCursor: null },
    filters: { query: searchQuery, financialStatus, after },
  } satisfies LoaderData;
};

// ─── Action ──────────────────────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const intent = formData.get("intent") as "add" | "remove" | "replace";
  const orderIds = JSON.parse(formData.get("orderIds") as string) as string[];
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
    await runMutation(TAGS_ADD, orderIds, () => tags);
  } else if (intent === "remove") {
    await runMutation(TAGS_REMOVE, orderIds, () => tags);
  } else {
    const currentTagsMap = JSON.parse(
      formData.get("currentTags") as string,
    ) as Record<string, string[]>;
    await runMutation(TAGS_REMOVE, orderIds, (id) => currentTagsMap[id] ?? []);
    await runMutation(TAGS_ADD, orderIds, () => tags);
  }

  return { success: errorCount === 0, errorCount } satisfies ActionData;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Orders() {
  const { orders, pageInfo, filters } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [localQuery, setLocalQuery] = useState(filters.query ?? "");

  const wasSubmitting = useRef(false);
  const isSubmitting = fetcher.state === "submitting";
  const activeModalId = useRef<string | null>(null);

  const allSelected =
    orders.length > 0 && orders.every((o) => selectedIds.includes(o.id));
  const hasFilters = filters.query || filters.financialStatus;

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
        if (activeModalId.current) {
          const el = document.getElementById(activeModalId.current) as (HTMLElement & { hide(): void }) | null;
          el?.hide();
          activeModalId.current = null;
        }
      } else {
        shopify.toast.show(`${fetcher.data.errorCount} error(s) occurred`, { isError: true });
      }
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    setLocalQuery(filters.query ?? "");
    setSelectedIds([]);
  }, [filters.query, filters.financialStatus]);

  const applyFilter = (updates: Partial<Record<keyof Filters, string | null>>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(updates)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    url.searchParams.delete("after");
    navigate(url.pathname + url.search);
  };

  const clearFilters = () => {
    setLocalQuery("");
    navigate("/app/orders");
  };

  const submitTagOperation = (intent: "add" | "remove" | "replace") => {
    activeModalId.current = `modal-${intent}`;
    const currentTags: Record<string, string[]> = {};
    for (const o of orders) currentTags[o.id] = o.tags;
    fetcher.submit(
      {
        intent,
        orderIds: JSON.stringify(selectedIds),
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
    <s-page heading="Orders">
      {/* Filter bar */}
      <s-section heading="Filters">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-search-field
              label="Search orders"
              placeholder="Order number or customer email"
              labelAccessibilityVisibility="exclusive"
              value={localQuery}
              onInput={(e: Event) =>
                setLocalQuery((e.target as HTMLInputElement).value)
              }
            />
            <s-select
              label="Financial status"
              value={filters.financialStatus ?? ""}
              onChange={(e: Event) =>
                applyFilter({
                  financialStatus: (e.target as HTMLSelectElement).value || null,
                })
              }
            >
              <s-option value="">All statuses</s-option>
              {FINANCIAL_STATUSES.map((s) => (
                <s-option key={s.value} value={s.value}>
                  {s.label}
                </s-option>
              ))}
            </s-select>
          </s-stack>
          <s-stack direction="inline" gap="base">
            <s-button onClick={() => applyFilter({ query: localQuery || null })}>
              Apply filters
            </s-button>
            {hasFilters && (
              <s-button variant="tertiary" onClick={clearFilters}>
                Clear
              </s-button>
            )}
          </s-stack>
        </s-stack>
      </s-section>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <s-section>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-text>
              {selectedIds.length} order{selectedIds.length !== 1 ? "s" : ""} selected
            </s-text>
            <s-button commandFor="modal-add">Add Tags</s-button>
            <s-button commandFor="modal-remove">Remove Tags</s-button>
            <s-button commandFor="modal-replace" tone="critical">
              Replace All Tags
            </s-button>
          </s-stack>
        </s-section>
      )}

      {/* Orders table */}
      <s-section>
        {orders.length === 0 ? (
          <s-paragraph>
            No orders found.{" "}
            {hasFilters
              ? "Try adjusting your filters."
              : "No orders in your store yet."}
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot="primary">
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-checkbox
                      label="Select all orders"
                      checked={allSelected}
                      onChange={() =>
                        setSelectedIds(allSelected ? [] : orders.map((o) => o.id))
                      }
                    />
                    <s-text>Order</s-text>
                  </s-stack>
                </s-table-header>
                <s-table-header listSlot="labeled">Customer</s-table-header>
                <s-table-header listSlot="labeled">Status</s-table-header>
                <s-table-header listSlot="labeled">Total</s-table-header>
                <s-table-header listSlot="labeled">Tags</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {orders.map((order) => (
                  <s-table-row key={order.id}>
                    <s-table-cell>
                      <s-stack direction="inline" gap="base" alignItems="center">
                        <s-checkbox
                          label={`Select ${order.name}`}
                          checked={selectedIds.includes(order.id)}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(order.id)
                                ? prev.filter((id) => id !== order.id)
                                : [...prev, order.id],
                            )
                          }
                        />
                        <s-text>{order.name}</s-text>
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      <s-text>{order.customer?.displayName ?? "—"}</s-text>
                    </s-table-cell>
                    <s-table-cell>
                      <s-text>{order.displayFinancialStatus ?? "—"}</s-text>
                    </s-table-cell>
                    <s-table-cell>
                      <s-text>
                        {order.totalPriceSet.shopMoney.amount}{" "}
                        {order.totalPriceSet.shopMoney.currencyCode}
                      </s-text>
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="base">
                        {order.tags.length > 0
                          ? order.tags.map((t) => <s-chip key={t}>{t}</s-chip>)
                          : <s-text tone="neutral">No tags</s-text>}
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>

            {pageInfo.hasNextPage && (
              <s-button variant="tertiary" onClick={loadNextPage}>
                Load more orders
              </s-button>
            )}
          </s-stack>
        )}
      </s-section>

      {/* Add Tags Modal */}
      <s-modal id="modal-add" heading="Add Tags">
        <s-stack direction="block" gap="base">
          <s-text>
            Add tags to {selectedIds.length} selected order
            {selectedIds.length !== 1 ? "s" : ""}.
          </s-text>
          <s-text-field
            label="Tags (comma-separated)"
            placeholder="vip, wholesale, reviewed"
            value={tagInput}
            onInput={(e: Event) =>
              setTagInput((e.target as HTMLInputElement).value)
            }
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
        <s-button
          slot="secondary-actions"
          variant="secondary"
          commandFor="modal-add"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>

      {/* Remove Tags Modal */}
      <s-modal id="modal-remove" heading="Remove Tags">
        <s-stack direction="block" gap="base">
          <s-text>
            Remove tags from {selectedIds.length} selected order
            {selectedIds.length !== 1 ? "s" : ""}.
          </s-text>
          <s-text-field
            label="Tags to remove (comma-separated)"
            placeholder="vip, wholesale, reviewed"
            value={tagInput}
            onInput={(e: Event) =>
              setTagInput((e.target as HTMLInputElement).value)
            }
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
        <s-button
          slot="secondary-actions"
          variant="secondary"
          commandFor="modal-remove"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>

      {/* Replace Tags Modal */}
      <s-modal id="modal-replace" heading="Replace All Tags">
        <s-stack direction="block" gap="base">
          <s-text>
            Replace all existing tags on {selectedIds.length} selected order
            {selectedIds.length !== 1 ? "s" : ""}. Current tags will be removed
            and replaced with the tags you enter below.
          </s-text>
          <s-text-field
            label="New tags (comma-separated)"
            placeholder="vip, wholesale, reviewed"
            value={tagInput}
            onInput={(e: Event) =>
              setTagInput((e.target as HTMLInputElement).value)
            }
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
        <s-button
          slot="secondary-actions"
          variant="secondary"
          commandFor="modal-replace"
          command="--hide"
        >
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
