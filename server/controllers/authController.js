
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Community = require("../models/Community");
const { cacheDeletePrefix } = require("../middleware/cache");

const STUDENT_ROLES = ["Student", "Student CR"];

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const userResponse = (user, campus) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  personalEmail: user.personalEmail || "",
  phoneNumber: user.phoneNumber || "",
  role: user.role,
  course: user.course || "",
  year: user.year,
  className: user.className || "",
  section: user.section || "",
  rollNumber: user.rollNumber || "",
  isActive: user.isActive,
  campusId: String(campus._id),
  campusName: campus.name,
  campusSlug: campus.slug,
});

const updateStudentCommunities = async (user) => {
  if (!STUDENT_ROLES.includes(user.role)) return;

  await Community.updateMany(
    { members: user._id },
    { $pull: { members: user._id } }
  );

  await Community.updateMany(
    {
      year: user.year,
      section: {
        $regex: `^${escapeRegex(user.section)}$`,
        $options: "i",
      },
    },
    {
      $addToSet: { members: user._id },
    }
  );

  cacheDeletePrefix("communities:");
};

// REGISTER STUDENT
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      year,
      section,
      rollNumber,
      course,
      personalEmail,
      phoneNumber,
    } = req.body;

    if (!name || !email || !password || !year || !section || !rollNumber || !course) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, course, year, section and roll number are required",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters",
      });
    }

    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({
        success: false,
        message: "Name must be 2–80 characters",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRollNumber = String(rollNumber).trim().toUpperCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid campus email",
      });
    }

    if (![1, 2, 3, 4].includes(Number(year))) {
      return res.status(400).json({
        success: false,
        message: "Year must be between 1 and 4",
      });
    }

    if (!normalizedRollNumber || !String(section).trim()) {
      return res.status(400).json({
        success: false,
        message: "Section and roll number are required",
      });
    }

    if (typeof course !== "string" || !course.trim() || course.trim().length > 120) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid course",
      });
    }

    if (personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(personalEmail).trim())) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid personal email",
      });
    }

    if (phoneNumber && !/^[+\d\s()-]{7,20}$/.test(String(phoneNumber).trim())) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid phone number",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const existingRollNumber = await User.findOne({
      rollNumber: normalizedRollNumber,
      role: { $in: STUDENT_ROLES },
    });

    if (existingRollNumber) {
      return res.status(409).json({
        success: false,
        message: "This roll number is already registered in your campus",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "Student",
      year: Number(year),
      section: String(section).trim(),
      rollNumber: normalizedRollNumber,
      course: course.trim(),
      personalEmail: personalEmail ? String(personalEmail).trim().toLowerCase() : "",
      phoneNumber: phoneNumber ? String(phoneNumber).trim() : "",
    });

    await updateStudentCommunities(user);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token: generateToken(user),
      user: userResponse(user, req.campus),
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or roll number is already registered in this campus",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled. Contact the administrator.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: generateToken(user),
      user: userResponse(user, req.campus),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// GET CURRENT USER
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: userResponse(req.user, req.campus),
  });
};

// UPDATE OWN PROFILE
const updateProfile = async (req, res) => {
  try {
    const {
      name,
      year,
      section,
      course,
      personalEmail,
      phoneNumber,
    } = req.body;

    const user = req.user;

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
        return res.status(400).json({
          success: false,
          message: "Name must be 2–80 characters",
        });
      }

      user.name = name.trim();
    }

    if (course !== undefined) {
      if (typeof course !== "string" || !course.trim() || course.trim().length > 120) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid course",
        });
      }

      user.course = course.trim();
    }

    if (personalEmail !== undefined) {
      if (personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(personalEmail).trim())) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid personal email",
        });
      }

      user.personalEmail = personalEmail
        ? String(personalEmail).trim().toLowerCase()
        : "";
    }

    if (phoneNumber !== undefined) {
      if (phoneNumber && !/^[+\d\s()-]{7,20}$/.test(String(phoneNumber).trim())) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid phone number",
        });
      }

      user.phoneNumber = String(phoneNumber).trim();
    }

    if (STUDENT_ROLES.includes(user.role)) {
      if (year !== undefined) {
        if (![1, 2, 3, 4].includes(Number(year))) {
          return res.status(400).json({
            success: false,
            message: "Year must be between 1 and 4",
          });
        }

        user.year = Number(year);
      }

      if (section !== undefined) {
        if (!String(section).trim()) {
          return res.status(400).json({
            success: false,
            message: "Section cannot be empty",
          });
        }

        user.section = String(section).trim();
      }
    }

    await user.save();

    if (STUDENT_ROLES.includes(user.role)) {
      await updateStudentCommunities(user);
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse(user, req.campus),
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update profile",
    });
  }
};

// CHANGE OWN PASSWORD
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const match = await bcrypt.compare(currentPassword, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.tokenVersion += 1;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
      token: generateToken(user),
    });
  } catch (error) {
    console.error("Change password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};
