# Skill: shopify-graphql

Standards for writing Shopify Admin GraphQL queries and mutations in this app.

## Before writing any query or mutation
Always use the Shopify Dev MCP (`mcp__shopify-dev-mcp__validate_graphql_codeblocks` or `mcp__shopify-dev-mcp__search_docs_chunks`) to validate field names and arguments before writing or modifying GraphQL. Never guess field names from memory.

## Calling GraphQL
```ts
const response = await admin.graphql(`#graphql
  query { ... }
`, { variables: { ... } });
const { data, errors } = await response.json();
```

## Pagination — always use cursor-based
```graphql
query GetProducts($first: Int!, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query) {
    pageInfo { hasNextPage endCursor }
    edges {
      node { id title tags }
    }
  }
}
```
- Default page size: `first: 50` for list screens, `first: 250` for bulk mutation loops.
- Never use offset pagination.

## Tag mutations — tagsAdd / tagsRemove
```graphql
mutation TagsAdd($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) {
    node { id }
    userErrors { field message }
  }
}

mutation TagsRemove($id: ID!, $tags: [String!]!) {
  tagsRemove(id: $id, tags: $tags) {
    node { id }
    userErrors { field message }
  }
}
```
- Works for Product, Collection, and Order GIDs.
- Always check `userErrors` — non-empty means the operation failed even if HTTP 200.

## userErrors handling — required on every mutation
```ts
const { data } = await response.json();
const errors = data?.tagsAdd?.userErrors ?? [];
if (errors.length > 0) {
  return { errors }; // surface to UI
}
```

## Batching
- Run mutations in batches of 10 using `Promise.all`.
- Never fire all mutations simultaneously — chunk with a simple loop.
```ts
const chunks = [];
for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));
for (const chunk of chunks) {
  await Promise.all(chunk.map(id => admin.graphql(MUTATION, { variables: { id, tags } })));
}
```

## Filter query strings (Shopify search syntax)
- By collection: not directly filterable in `products` query — fetch collection products via `collection.products`.
- By vendor: `query: "vendor:${vendor}"`
- By product type: `query: "product_type:${type}"`
- By tag: `query: "tag:${tag}"`
- By title: `query: "title:${title}*"` (prefix wildcard)
- Combine: `query: "vendor:Nike tag:sale"`
