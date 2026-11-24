import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { rewriteBullet } from "./resumeRoutes";
import type { TrpcContext } from "./_core/context";

const publicContext = (): TrpcContext => ({
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("ResumeIQ rewrite engine", () => {
  it("turns a responsibility bullet into a quantified STAR-style prompt", () => {
    const rewritten = rewriteBullet("Built dashboards for the sales team", "Senior Product Analyst");
    expect(rewritten).toContain("Built dashboards for the sales team");
    expect(rewritten).toContain("[X%]");
    expect(rewritten).toContain("Senior Product Analyst");
  });

  it("supports the public tRPC rewrite procedure", async () => {
    const result = await appRouter.createCaller(publicContext()).resume.rewriteBullet({
      bullet: "Managed weekly reporting",
      context: "Business Operations",
    });
    expect(result.rewrite).toMatch(/Managed weekly reporting/);
    expect(result.rewrite).toMatch(/\[N\]/);
  });
});
