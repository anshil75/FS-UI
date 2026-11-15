
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Announcement", "Notes", "Assignment", "Discussion"],
    default: "Discussion",
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },

  year: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
  },

  section: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],

  posts: [postSchema],

}, { timestamps: true });

communitySchema.index({ owner: 1, createdAt: -1 });
communitySchema.index({ year: 1, section: 1 });

communitySchema.plugin(require("../tenancy/tenantScopePlugin"));

module.exports = mongoose.model("Community", communitySchema);
