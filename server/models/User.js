
const mongoose = require("mongoose");

const STUDENT_ROLES = ["Student", "Student CR"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: [true, "Campus email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Enter a valid campus email",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
      minlength: 8,
    },

    role: {
      type: String,
      enum: ["Student", "Student CR", "Teacher", "Admin"],
      default: "Student",
      required: true,
    },

    course: {
      type: String,
      required: [true, "Course is required"],
      trim: true,
      maxlength: 120,
    },

    personalEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
      maxlength: 120,
      match: [
        /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Enter a valid personal email address",
      ],
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
      match: [
        /^$|^[+\d\s()-]{7,20}$/,
        "Enter a valid phone number",
      ],
    },

    year: {
      type: Number,
      min: 1,
      max: 4,
      required: function () {
        return STUDENT_ROLES.includes(this.role);
      },
    },

    className: {
      type: String,
      trim: true,
      default: "",
    },

    section: {
      type: String,
      trim: true,
      default: "",
      required: function () {
        return STUDENT_ROLES.includes(this.role);
      },
    },

    rollNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      required: function () {
        return STUDENT_ROLES.includes(this.role);
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically scopes campus data using the original Campus._id.
userSchema.plugin(require("../tenancy/tenantScopePlugin"));

// Campus login email must be unique within each campus.
userSchema.index(
  { tenantId: 1, email: 1 },
  { unique: true }
);

// Student roll numbers must be unique within each campus.
userSchema.index(
  { tenantId: 1, rollNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: { $in: STUDENT_ROLES },
      rollNumber: { $type: "string", $gt: "" },
    },
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
