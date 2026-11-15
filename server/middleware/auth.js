
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// VERIFY JWT AND AUTHENTICATE USER
const protect = async (req, res, next) => {
  let decoded;

  // 1. Extract token
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please login.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is missing.",
    });
  }

  // 2. Verify token
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }

  // 3. Fetch user within the resolved campus tenant
  try {
    if (!req.campus) {
      return res.status(400).json({
        success: false,
        message: "Campus context is missing.",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found in this campus.",
      });
    }

    // 4. Explicit campus isolation check
    if (
      !user.tenantId ||
      String(user.tenantId) !== String(req.campus._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this campus.",
      });
    }

    // 5. Verify token version
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    // 6. Check account status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is disabled.",
      });
    }

    req.user = user;
    return next();

  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Authentication service temporarily unavailable.",
    });
  }
};

// RESTRICT ACCESS BY USER ROLE
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    return next();
  };
};

module.exports = {
  protect,
  authorize,
};
