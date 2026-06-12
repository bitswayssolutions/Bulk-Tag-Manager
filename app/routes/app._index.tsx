import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <s-page heading="Bulk Tag Manager">
      <s-section heading="Manage tags at scale">
        <s-paragraph>
          Select a resource type to bulk add, remove, or replace tags across your store.
        </s-paragraph>
      </s-section>

      <s-section heading="Products">
        <s-paragraph>
          Add, remove, or replace tags across multiple products at once. Filter by
          collection, vendor, product type, or existing tag.
        </s-paragraph>
        <s-link href="/app/products">
          <s-button variant="primary">Manage product tags</s-button>
        </s-link>
      </s-section>

      <s-section heading="Collections">
        <s-paragraph>
          Bulk update tags on your collections.
        </s-paragraph>
        <s-link href="/app/collections">
          <s-button variant="primary">Manage collection tags</s-button>
        </s-link>
      </s-section>

      <s-section heading="Orders">
        <s-paragraph>
          Bulk update tags on your orders.
        </s-paragraph>
        <s-link href="/app/orders">
          <s-button variant="primary">Manage order tags</s-button>
        </s-link>
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
