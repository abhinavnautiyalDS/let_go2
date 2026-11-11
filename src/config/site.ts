/**
 * Public, non-secret application metadata and stable route paths.
 * Keep secrets and deployment-specific values out of this module.
 */
export const siteConfig = {
  name: "LET GO",
  description: "A quiet ritual for letting go",
  routes: {
    home: "/",
    ritual: "/ritual",
  },
} as const;
