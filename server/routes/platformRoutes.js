
const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");

const {
  platformLogin,
  listCampuses,
  createCampus,
  updateCampusStatus,
  listPublicCampuses,
  registerNewCampus,
} = require("../controllers/platformController");

const {
  protectPlatform,
  platformOwnerOnly,
} = require("../middleware/platformAuth");

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many platform login attempts. Try again later.",
  },
});

const registrationLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many campus registration attempts. Try again later.",
  },
});

// Public endpoints
router.post("/auth/login", loginLimit, platformLogin);
router.get("/campuses/public", listPublicCampuses);
router.post("/campuses/register", registrationLimit, registerNewCampus);

// Platform Owner endpoints
router.use(protectPlatform, platformOwnerOnly);

router.get("/campuses", listCampuses);
router.post("/campuses", createCampus);
router.patch("/campuses/:id/status", updateCampusStatus);

module.exports = router;
