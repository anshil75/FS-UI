
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const STUDENT_ROLES = ["Student", "Student CR"];
const STAFF_ROLES = ["Teacher", "Admin"];
const ALL_ROLES = [...STUDENT_ROLES, ...STAFF_ROLES];
const EDITABLE_ROLES = ["Student", "Student CR", "Teacher"];

const isStudent = (role) => STUDENT_ROLES.includes(role);

const validEmail = (email) =>
  typeof email === "string" &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const validPhone = (phone) =>
  !phone || /^[+\d\s()-]{7,20}$/.test(String(phone).trim());

const validateCommonFields = ({
  name,
  email,
  personalEmail,
  phoneNumber,
  course,
}) => {
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80)
    return "Name must be 2–80 characters";

  if (!validEmail(email)) return "Enter a valid campus email";

  if (personalEmail && !validEmail(personalEmail))
    return "Enter a valid personal email";

  if (!validPhone(phoneNumber))
    return "Enter a valid phone number";

  if (typeof course !== "string" || !course.trim() || course.trim().length > 120)
    return "Course is required (maximum 120 characters)";

  return null;
};

const validateRoleFields = ({ role, year, section, rollNumber }) => {
  if (!ALL_ROLES.includes(role)) return "Invalid role";

  if (isStudent(role)) {
    if (![1, 2, 3, 4].includes(Number(year)))
      return "Valid year (1–4) is required for students";

    if (typeof section !== "string" || !section.trim())
      return "Section is required for students";

    if (typeof rollNumber !== "string" || !rollNumber.trim())
      return "Roll number is required for students";
  }

  return null;
};

const userResponse = (user, campusId) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  personalEmail: user.personalEmail,
  phoneNumber: user.phoneNumber,
  course: user.course,
  role: user.role,
  year: user.year,
  className: user.className,
  section: user.section,
  rollNumber: user.rollNumber,
  isActive: user.isActive,
  campusId: String(campusId),
});

// GET USERS
const getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || "").trim();
    const role = req.query.role;

    const filter = {};

    if (role) {
      if (!ALL_ROLES.includes(role))
        return res.status(400).json({ success: false, message: "Invalid role filter" });

      filter.role = role;
    }

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safeSearch, "i");

      filter.$or = [
        { name: regex },
        { email: regex },
        { personalEmail: regex },
        { rollNumber: regex },
        { role: regex },
        { course: regex },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      users: users.map((user) => userResponse(user, req.campus._id)),
    });
  } catch (error) {
    console.error("Get users error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to fetch users" });
  }
};

// CREATE USER
const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      year,
      className,
      section,
      rollNumber,
      course,
      personalEmail,
      phoneNumber,
    } = req.body;

    if (!password || typeof password !== "string" || password.length < 8)
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters",
      });

    const commonError = validateCommonFields({
      name, email, personalEmail, phoneNumber, course,
    });

    if (commonError)
      return res.status(400).json({ success: false, message: commonError });

    const roleError = validateRoleFields({ role, year, section, rollNumber });

    if (roleError)
      return res.status(400).json({ success: false, message: roleError });

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser)
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });

    const hashedPassword = await bcrypt.hash(password, 12);

    const student = isStudent(role);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      course: course.trim(),
      personalEmail: personalEmail ? personalEmail.trim().toLowerCase() : "",
      phoneNumber: phoneNumber ? phoneNumber.trim() : "",
      year: student ? Number(year) : undefined,
      className: student ? String(className || "").trim() : "",
      section: student ? section.trim() : "",
      rollNumber: student ? rollNumber.trim().toUpperCase() : "",
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userResponse(user, req.campus._id),
    });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({
        success: false,
        message: "Email or roll number already exists in this campus",
      });

    console.error("Create user error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to create user" });
  }
};

// CHANGE USER ROLE
// CHANGE USER ROLE
const updateUserRole = async (req, res) => {
  try {
    const { role, year, section, rollNumber, className } = req.body;

    if (!EDITABLE_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Admin role cannot be assigned here.",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "Admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be modified through this API",
      });
    }

    if (isStudent(role)) {
      const nextYear = year !== undefined ? Number(year) : user.year;
      const nextSection = section !== undefined ? String(section).trim() : user.section;
      const nextRoll = rollNumber !== undefined
        ? String(rollNumber).trim().toUpperCase()
        : user.rollNumber;

      if (![1, 2, 3, 4].includes(nextYear) || !nextSection || !nextRoll) {
        return res.status(400).json({
          success: false,
          message: "Year, section and roll number are required for student roles",
        });
      }

      user.year = nextYear;
      user.section = nextSection;
      user.rollNumber = nextRoll;

      if (className !== undefined) {
        user.className = String(className).trim();
      }
    } else {
      user.year = undefined;
      user.section = "";
      user.rollNumber = "";
      user.className = "";
    }

    user.role = role;
    user.tokenVersion += 1;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user: userResponse(user, req.campus._id),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Roll number already exists",
      });
    }

    console.error("Update role error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update user role",
    });
  }
};

// ACTIVATE / DEACTIVATE USER
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean")
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });

    const user = await User.findById(req.params.id);

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (user.role === "Admin")
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be modified through this API",
      });

    if (user.isActive !== isActive) {
      user.isActive = isActive;
      user.tokenVersion += 1;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: `User account ${isActive ? "activated" : "deactivated"} successfully`,
      user: userResponse(user, req.campus._id),
    });
  } catch (error) {
    console.error("Update status error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to update user status" });
  }
};

// RESET USER PASSWORD
const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (typeof newPassword !== "string" || newPassword.length < 8)
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 8 characters",
      });

    const user = await User.findById(req.params.id).select("+password");

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (user.role === "Admin")
      return res.status(403).json({
        success: false,
        message: "Admin passwords cannot be reset through this API",
      });

    user.password = await bcrypt.hash(newPassword, 12);
    user.tokenVersion += 1;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to reset user password" });
  }
};

// GET SINGLE USER
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({
      success: true,
      user: userResponse(user, req.campus._id),
    });
  } catch (error) {
    console.error("Get user error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to fetch user" });
  }
};

// UPDATE USER
const updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      year,
      className,
      section,
      rollNumber,
      course,
      personalEmail,
      phoneNumber,
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (user.role === "Admin")
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be modified through this API",
      });

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80)
        return res.status(400).json({ success: false, message: "Name must be 2–80 characters" });

      user.name = name.trim();
    }

    if (email !== undefined) {
      if (!validEmail(email))
        return res.status(400).json({ success: false, message: "Enter a valid email address" });

      const normalizedEmail = email.trim().toLowerCase();

      const existing = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });

      if (existing)
        return res.status(409).json({ success: false, message: "Email already in use" });

      user.email = normalizedEmail;
    }

    if (personalEmail !== undefined) {
      if (personalEmail && !validEmail(personalEmail))
        return res.status(400).json({ success: false, message: "Enter a valid personal email" });

      user.personalEmail = personalEmail ? personalEmail.trim().toLowerCase() : "";
    }

    if (phoneNumber !== undefined) {
      if (!validPhone(phoneNumber))
        return res.status(400).json({ success: false, message: "Enter a valid phone number" });

      user.phoneNumber = String(phoneNumber).trim();
    }

    if (course !== undefined) {
      if (typeof course !== "string" || !course.trim() || course.trim().length > 120)
        return res.status(400).json({ success: false, message: "Valid course is required" });

      user.course = course.trim();
    }

    if (isStudent(user.role)) {
      if (year !== undefined) {
        if (![1, 2, 3, 4].includes(Number(year)))
          return res.status(400).json({ success: false, message: "Year must be between 1 and 4" });

        user.year = Number(year);
      }

      if (section !== undefined) user.section = String(section).trim();
      if (className !== undefined) user.className = String(className).trim();

      if (rollNumber !== undefined)
        user.rollNumber = String(rollNumber).trim().toUpperCase();

      if (!user.section || !user.rollNumber || !user.year)
        return res.status(400).json({
          success: false,
          message: "Student year, section and roll number are required",
        });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: userResponse(user, req.campus._id),
    });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({
        success: false,
        message: "Email or roll number already in use",
      });

    console.error("Update user error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to update user" });
  }
};

// BULK IMPORT USERS
const bulkImportUsers = async (req, res) => {
  try {
    const { users: rawUsers } = req.body;

    if (!Array.isArray(rawUsers) || rawUsers.length === 0)
      return res.status(400).json({
        success: false,
        message: "Provide an array of users to import",
      });

    if (rawUsers.length > 200)
      return res.status(400).json({
        success: false,
        message: "Maximum 200 users per import batch",
      });

    const results = { created: 0, failed: [], skipped: 0 };

    for (const raw of rawUsers) {
      try {
        const {
          name, email, password, role, year, className,
          section, rollNumber, course, personalEmail, phoneNumber,
        } = raw;

        if (!password || typeof password !== "string" || password.length < 8) {
          results.failed.push({
            email: email || "(missing)",
            reason: "Password must contain at least 8 characters",
          });
          continue;
        }

        const commonError = validateCommonFields({
          name, email, personalEmail, phoneNumber, course,
        });

        if (commonError) {
          results.failed.push({ email: email || "(missing)", reason: commonError });
          continue;
        }

        const roleError = validateRoleFields({ role, year, section, rollNumber });

        if (roleError) {
          results.failed.push({ email, reason: roleError });
          continue;
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existing = await User.findOne({ email: normalizedEmail });

        if (existing) {
          results.skipped++;
          continue;
        }

        const student = isStudent(role);
        const hashed = await bcrypt.hash(password, 12);

        await User.create({
          name: name.trim(),
          email: normalizedEmail,
          password: hashed,
          role,
          course: course.trim(),
          personalEmail: personalEmail ? personalEmail.trim().toLowerCase() : "",
          phoneNumber: phoneNumber ? phoneNumber.trim() : "",
          year: student ? Number(year) : undefined,
          className: student ? String(className || "").trim() : "",
          section: student ? section.trim() : "",
          rollNumber: student ? rollNumber.trim().toUpperCase() : "",
        });

        results.created++;
      } catch (error) {
        results.failed.push({
          email: raw.email || "(unknown)",
          reason: error.code === 11000
            ? "Email or roll number already exists"
            : error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Import complete: ${results.created} created, ${results.skipped} skipped, ${results.failed.length} failed`,
      results,
    });
  } catch (error) {
    console.error("Bulk import error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to process bulk import",
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  resetUserPassword,
  bulkImportUsers,
};
