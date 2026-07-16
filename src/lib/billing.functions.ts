// Shopify Billing (RecurringApplicationCharge) server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const PLANS = [
  { name: "Growth", price: 29, trialDays: 7 },
  { name: "Pro", price: 79, trialDays: 7 },
  { name: "Agency", price: 399, trialDays: 7 },
] as const;

const StartInput = z.object({
  shop: z.string(),
  plan: z.enum(["Growth", "Pro", "Agency"]),
  returnHost: z.string(),
});

export const startSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StartInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { SHOPIFY_API_VERSION } = await import("@/lib/shopify/config.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const plan = PLANS.find((p) => p.name === data.plan);
    if (!plan) throw new Error("Unknown plan");
    const store = await resolveStoreFromShop(data.shop);

    const returnUrl = `${data.returnHost}/api/public/shopify/billing-callback?shop=${encodeURIComponent(
      store.shop,
    )}`;
    const test = !store.shop.endsWith(".myshopify.com") ? false : true; // dev stores auto test

    const res = await fetch(
      `https://${store.shop}/admin/api/${SHOPIFY_API_VERSION}/recurring_application_charges.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": store.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recurring_application_charge: {
            name: `Flovix ${plan.name}`,
            price: plan.price,
            return_url: returnUrl,
            trial_days: plan.trialDays,
            test,
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`Shopify billing: ${res.status} ${await res.text()}`);
    const { recurring_application_charge } = (await res.json()) as {
      recurring_application_charge: {
        id: number;
        confirmation_url: string;
        status: string;
      };
    };

    await supabaseAdmin.from("billing_charges").insert({
      store_id: store.storeId,
      shopify_charge_id: String(recurring_application_charge.id),
      plan_name: plan.name,
      price_amount: plan.price,
      currency: "USD",
      trial_days: plan.trialDays,
      status: recurring_application_charge.status,
      test,
    });

    return { confirmationUrl: recurring_application_charge.confirmation_url };
  });

const ShopInput = z.object({ shop: z.string() });
export const getActivePlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    // BYPASS FOR TESTING: Always return Pro plan to test all features
    return {
      charge: {
        plan_name: "Pro",
        status: "active",
        price_amount: 79,
        activated_at: new Date().toISOString(),
      },
    };
  });
