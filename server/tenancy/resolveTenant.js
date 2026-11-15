
const Campus = require("../models/Campus");
const { runWithTenant } = require("./context");

const resolveTenant = async (req, res, next) => {
  try {
    const host = String(req.headers.host || "")
      .split(":")[0]
      .toLowerCase()
      .trim();

    const configuredRoot = String(
      process.env.ROOT_DOMAIN || "campuscare.in"
    )
      .toLowerCase()
      .trim();

    // Detect campus subdomain
    let subdomain = "";

    if (
      host.endsWith(`.${configuredRoot}`) &&
      host !== configuredRoot
    ) {
      subdomain = host.slice(
        0,
        -(configuredRoot.length + 1)
      ).split(".")[0];
    }

    // Resolve campus slug from request or environment
    const slug = String(
      req.headers["x-campus-slug"] ||
      req.body?.campusSlug ||
      req.body?.campus ||
      req.query?.campusSlug ||
      req.query?.campus ||
      subdomain ||
      process.env.DEFAULT_CAMPUS_SLUG ||
      ""
    )
      .toLowerCase()
      .trim();

    let campus;

    // 1. Find campus using slug
    if (slug) {
      campus = await Campus.findOne({
        status: "active",
        slug,
      }).lean();
    } else if (host) {
      // 2. Find campus using its verified custom domain
      campus = await Campus.findOne({
        status: "active",
        $or: [
    { domains: host },
    { primaryDomain: host },
  ],
      }).lean();
    }

    if (!campus) {
      return res.status(slug ? 404 : 400).json({
        success: false,
        code: slug ? "CAMPUS_NOT_FOUND" : "CAMPUS_REQUIRED",
        message: slug
          ? "Campus not found or not active."
          : "Select your campus or open its campus-specific URL.",
      });
    }

    // Attach original Campus document to request
    req.campus = campus;

    // Original Campus._id is the tenantId
    return runWithTenant(
      {
        tenantId: campus._id,
        campus,
      },
      next
    );

  } catch (error) {
    console.error("Tenant resolution error:", error.message);
    return next(error);
  }
};

module.exports = resolveTenant;
