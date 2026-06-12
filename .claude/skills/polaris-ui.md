# Skill: polaris-ui

Standards for building UI in this app using Shopify's App Home Polaris web components.

## Component system
This app uses **Polaris web components** (`<s-*>` custom elements), NOT `@shopify/polaris` React components. These are two different libraries. Always use `<s-*>` tags.

Reference: https://shopify.dev/docs/api/app-home/polaris-web-components

## Core layout components
```tsx
<s-page heading="Page Title">
  <s-button slot="primary-action" onClick={handler}>Primary</s-button>
  <s-section heading="Section Title">
    <s-paragraph>Body text</s-paragraph>
  </s-section>
  <s-section slot="aside" heading="Sidebar">...</s-section>
</s-page>
```

## Cards / sections
```tsx
<s-section heading="Title">
  <s-stack direction="block" gap="base">
    ...children
  </s-stack>
</s-section>
```

## Buttons
```tsx
<s-button onClick={fn}>Default</s-button>
<s-button variant="primary" onClick={fn}>Primary</s-button>
<s-button variant="tertiary" onClick={fn}>Tertiary</s-button>
<s-button {...(isLoading ? { loading: true } : {})}>Loading</s-button>
<s-button tone="critical" onClick={fn}>Destructive</s-button>
```

## Navigation links
```tsx
<s-link href="/app/products">Go to Products</s-link>   // internal nav
<s-link href="https://..." target="_blank">External</s-link>
```
Never use bare `<a>` tags inside the embedded app.

## Stack / layout
```tsx
<s-stack direction="inline" gap="base">...</s-stack>   // horizontal
<s-stack direction="block" gap="base">...</s-stack>    // vertical
// gap values: "none" | "base" | "loose" (not "tight")
```

## Box
```tsx
<s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
  ...
</s-box>
```

## Text
```tsx
<s-heading>Heading</s-heading>
<s-text>Body text</s-text>
<s-text tone="neutral">Muted text</s-text>
// tone values: "auto" | "success" | "critical" | "neutral" | "caution" | "warning" | "info" (not "subdued")
```

## Lists
```tsx
<s-unordered-list>
  <s-list-item>Item one</s-list-item>
  <s-list-item>Item two</s-list-item>
</s-unordered-list>
```

## Loading / skeleton states
Show `<s-spinner>` or wrap the whole page in a skeleton section while loader data is fetching. Never show a blank page.

## Toast notifications
Use App Bridge via `useAppBridge`:
```ts
const shopify = useAppBridge();
shopify.toast.show("Tags updated");
shopify.toast.show("Error occurred", { isError: true });
```

## Empty states
```tsx
<s-section heading="No products found">
  <s-paragraph>Try adjusting your filters.</s-paragraph>
</s-section>
```

## No custom CSS
Do not write custom CSS or use `style={{}}` except for pre/code blocks that have no Polaris equivalent.
