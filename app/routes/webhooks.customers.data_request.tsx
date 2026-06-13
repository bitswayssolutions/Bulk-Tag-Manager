import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// This app stores no customer data — acknowledge the request and return 200.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  return new Response();
};
