# /graphql-test

Validates a GraphQL query or mutation against the Shopify Admin API using the Shopify Dev MCP before committing it to code.

## Usage
`/graphql-test <query or mutation to validate>`

Paste the raw GraphQL string as the argument, or describe what you want to query.

## Steps to perform

1. Use `mcp__shopify-dev-mcp__validate_graphql_codeblocks` to validate the exact GraphQL syntax and field names against the live Shopify Admin API schema (October25).

2. If validation fails, use `mcp__shopify-dev-mcp__search_docs_chunks` to look up the correct field names and argument types, then correct the query.

3. Check for:
   - All requested fields exist on the type
   - Required arguments are present
   - Mutation response includes `userErrors { field message }`
   - Pagination uses `pageInfo { hasNextPage endCursor }` and cursor args (`first`, `after`)

4. Report back:
   - ✅ Valid — paste the corrected query ready to use
   - ❌ Invalid — explain what's wrong and provide the fix

## Never skip this step
Do not write GraphQL into route files until this command confirms it is valid.
