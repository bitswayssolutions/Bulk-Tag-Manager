# /shopify-route

Scaffolds a new Shopify embedded app route following project conventions.

## Usage
`/shopify-route <route-name> <description>`

Example: `/shopify-route app.products "Products tag manager"`

## What to generate

Create `app/routes/<route-name>.tsx` with this structure:

```tsx
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // TODO: fetch data via admin.graphql(...)

  return { /* data */ };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  // TODO: handle mutations

  return { success: true };
};

export default function RouteName() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  return (
    <s-page heading="Page Title">
      {/* TODO: build UI */}
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
```

## Rules to follow when scaffolding
- Always call `authenticate.admin(request)` in both loader and action
- Use `<s-*>` Polaris web components — never standard HTML elements for layout
- Use `useFetcher` for actions (not `useActionData`) so UI doesn't navigate away
- Export `ErrorBoundary` and `headers` on every route under `app/`
- Use Shopify Dev MCP to validate any GraphQL before adding it
- No `any` types — infer from loader return type via `useLoaderData<typeof loader>()`
