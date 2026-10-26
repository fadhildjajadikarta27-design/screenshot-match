import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADDON_IDS, AUDIENCE_IDS, PAID_PLAN_IDS, type AddonId, type AudienceId, type PlanId } from "./plans";

const input = z.object({
  eventType: z.string().max(40),
  audience: z.enum(AUDIENCE_IDS as [AudienceId, ...AudienceId[]]),
  needs: z.string().trim().min(10, "Ceritakan kebutuhan acaramu sedikit lebih detail.").max(1500),
});

export type Recommendation = { plan: PlanId; addons: AddonId[]; reason: string };

export const recommendPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; rec: Recommendation } | { ok: false; error: string }> => {
    const { runRecommendation } = await import("./recommend.server");
    return runRecommendation(data);
  });

export const RECOMMEND_PLAN_IDS = PAID_PLAN_IDS;
export const RECOMMEND_ADDON_IDS = ADDON_IDS;
