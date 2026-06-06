process.env.OPOS_SMOKE_ROLE = process.env.OPOS_SMOKE_ROLE || "admin";
process.env.OPOS_EXPECT_ADMIN = "true";

await import("./smoke-cloud-auth.mjs");
