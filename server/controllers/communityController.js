
const { cacheGet, cacheSet, cacheDeletePrefix } = require("../middleware/cache");
const mongoose = require("mongoose");
const Community = require("../models/Community");
const User = require("../models/User");

const STUDENT_ROLES = ["Student", "Student CR"];

const sameSection = (a, b) =>
  String(a || "").trim().toLowerCase() ===
  String(b || "").trim().toLowerCase();

const getMatchingStudents = async (year, section) => {
  return User.find({
    role: { $in: STUDENT_ROLES },
    isActive: true,
    year: Number(year),
    section: { $regex: `^${String(section).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  }).select("_id");
};

const populateCommunity = (query) =>
  query
    .populate("owner", "name role")
    .populate("members", "name email role")
    .populate("posts.author", "name role");

const getCommunities = async (req, res) => {
  try {
    const key = `communities:${req.user.role}:${req.user._id}`;
    const cached = cacheGet(key);
    if (cached) return res.json({ ...cached, cache: "HIT" });

    const filter = {};

    if (STUDENT_ROLES.includes(req.user.role)) {
      filter.year = Number(req.user.year || 1);
      filter.section = String(req.user.section || "").trim();
    }

    const groups = await populateCommunity(Community.find(filter))
      .sort({ createdAt: -1 });

    const payload = { success: true, total: groups.length, groups };
    cacheSet(key, payload, 20000);

    res.json({ ...payload, cache: "MISS" });
  } catch (e) {
    console.error("Get communities error:", e);
    res.status(500).json({ success: false, message: "Unable to load communities" });
  }
};

const createCommunity = async (req, res) => {
  try {
    if (req.user.role !== "Teacher") {
      return res.status(403).json({ success: false, message: "Only teachers can create communities" });
    }

    const name = String(req.body.name || "").trim();
    const year = Number(req.body.year);
    const section = String(req.body.section || "").trim();

    if (!name || ![1, 2, 3, 4].includes(year) || !section) {
      return res.status(400).json({
        success: false,
        message: "Community name, valid year and section are required",
      });
    }

    const students = await getMatchingStudents(year, section);
    const members = [...new Set([
      String(req.user._id),
      ...students.map(s => String(s._id)),
    ])];

    const group = await Community.create({
      name,
      year,
      section,
      owner: req.user._id,
      members,
    });

    cacheDeletePrefix("communities:");

    const populated = await populateCommunity(Community.findById(group._id));

    res.status(201).json({
      success: true,
      group: populated,
      addedStudents: students.length,
    });
  } catch (e) {
    console.error("Create community error:", e);
    res.status(500).json({ success: false, message: "Unable to create community" });
  }
};

const getCommunity = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid community ID" });
    }

    const group = await populateCommunity(Community.findById(req.params.id));
    if (!group) return res.status(404).json({ success: false, message: "Community not found" });

    const userId = String(req.user._id);
    const isAdmin = req.user.role === "Admin";
    const isOwner = String(group.owner?._id || group.owner) === userId;
    const isMember = group.members.some(m => String(m._id || m) === userId);

    const eligibleStudent =
      STUDENT_ROLES.includes(req.user.role) &&
      Number(group.year) === Number(req.user.year || 1) &&
      sameSection(group.section, req.user.section);

    if (!isAdmin && !isOwner && !isMember && !eligibleStudent) {
      return res.status(403).json({
        success: false,
        message: "You are not eligible to access this community",
      });
    }

    res.json({ success: true, group });
  } catch (e) {
    console.error("Get community error:", e);
    res.status(500).json({ success: false, message: "Unable to load community" });
  }
};

const addPost = async (req, res) => {
  try {
    const group = await Community.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Community not found" });

    const allowed =
      String(group.owner) === String(req.user._id) ||
      req.user.role === "Admin" ||
      group.members.some(m => String(m) === String(req.user._id));

    if (!allowed) {
      return res.status(403).json({ success: false, message: "You are not a community member" });
    }

    const type = req.body.type || "Discussion";
    const content = String(req.body.content || "").trim();

    const permissions = {
      Teacher: ["Announcement", "Notes", "Assignment", "Discussion"],
      Admin: ["Announcement"],
      "Student CR": ["Notes", "Discussion"],
      Student: ["Notes", "Discussion"],
    };

    if (!permissions[req.user.role]?.includes(type)) {
      return res.status(403).json({ success: false, message: "Your role cannot publish this post type" });
    }

    if (!content) {
      return res.status(400).json({ success: false, message: "Post content is required" });
    }

    group.posts.push({ type, content, author: req.user._id });
    await group.save();

    const saved = await populateCommunity(Community.findById(group._id));

    req.app.get("io")?.to(
      `community:${String(req.campus?._id || "")}:${String(group._id)}`
    ).emit("community-post", {
      communityId: String(group._id),
      post: saved.posts[saved.posts.length - 1],
    });

    res.status(201).json({ success: true, group: saved });
  } catch (e) {
    console.error("Add post error:", e);
    res.status(500).json({ success: false, message: "Unable to publish post" });
  }
};

const addMember = async (req, res) => {
  try {
    const group = await Community.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Community not found" });

    const isOwner = req.user.role === "Teacher" &&
      String(group.owner) === String(req.user._id);

    const isMemberCR = req.user.role === "Student CR" &&
      group.members.some(m => String(m) === String(req.user._id));

    if (!isOwner && !isMemberCR) {
      return res.status(403).json({ success: false, message: "You cannot add members" });
    }

    const email = String(req.body.email || "").toLowerCase().trim();
    const allowedRoles = isMemberCR ? ["Student"] : STUDENT_ROLES;

    const student = await User.findOne({
      email,
      role: { $in: allowedRoles },
      isActive: true,
      year: group.year,
      section: { $regex: `^${String(group.section).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "No active student found with matching Year and Section",
      });
    }

    if (!group.members.some(m => String(m) === String(student._id))) {
      group.members.push(student._id);
      await group.save();
    }

    cacheDeletePrefix("communities:");
    const updated = await populateCommunity(Community.findById(group._id));
    res.json({ success: true, group: updated });
  } catch (e) {
    console.error("Add member error:", e);
    res.status(500).json({ success: false, message: "Unable to add member" });
  }
};

const removeMember = async (req, res) => {
  try {
    const group = await Community.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Community not found" });

    if (req.user.role !== "Teacher" || String(group.owner) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the creating teacher can remove members",
      });
    }

    const memberId = String(req.params.memberId);
    if (memberId === String(group.owner)) {
      return res.status(400).json({ success: false, message: "Community owner cannot be removed" });
    }

    group.members = group.members.filter(m => String(m) !== memberId);
    await group.save();

    cacheDeletePrefix("communities:");
    const updated = await populateCommunity(Community.findById(group._id));
    res.json({ success: true, group: updated });
  } catch (e) {
    console.error("Remove member error:", e);
    res.status(500).json({ success: false, message: "Unable to remove member" });
  }
};

const joinCommunity = async (req, res) => {
  try {
    const group = await Community.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Community not found" });

    if (!STUDENT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Only students can join communities" });
    }

    const eligible =
      Number(group.year) === Number(req.user.year || 1) &&
      sameSection(group.section, req.user.section);

    if (!eligible) {
      return res.status(403).json({
        success: false,
        message: "This community is not assigned to your Year and Section",
      });
    }

    if (!group.members.some(m => String(m) === String(req.user._id))) {
      group.members.push(req.user._id);
      await group.save();
    }

    cacheDeletePrefix("communities:");
    const updated = await populateCommunity(Community.findById(group._id));
    res.json({ success: true, group: updated });
  } catch (e) {
    console.error("Join community error:", e);
    res.status(500).json({ success: false, message: "Unable to join community" });
  }
};

const updateCommunity = async (req, res) => {
  try {
    if (req.user.role !== "Teacher") {
      return res.status(403).json({ success: false, message: "Only teachers can edit communities" });
    }

    const group = await Community.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Community not found" });

    if (String(group.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only the creating teacher can edit this community" });
    }

    const name = req.body.name !== undefined ? String(req.body.name).trim() : group.name;
    const year = req.body.year !== undefined ? Number(req.body.year) : group.year;
    const section = req.body.section !== undefined ? String(req.body.section).trim() : group.section;

    if (!name || ![1, 2, 3, 4].includes(year) || !section) {
      return res.status(400).json({ success: false, message: "Valid name, year and section are required" });
    }

    const students = await getMatchingStudents(year, section);

    group.name = name;
    group.year = year;
    group.section = section;
    group.members = [...new Set([
      String(group.owner),
      ...students.map(s => String(s._id)),
    ])];

    await group.save();
    cacheDeletePrefix("communities:");

    const updated = await populateCommunity(Community.findById(group._id));
    res.json({ success: true, group: updated, addedStudents: students.length });
  } catch (e) {
    console.error("Update community error:", e);
    res.status(500).json({ success: false, message: "Unable to update community" });
  }
};

const deleteCommunity = async (req, res) => {
  try {
    if (req.user.role !== "Teacher") {
      return res.status(403).json({ success: false, message: "Only teachers can delete communities" });
    }

    const group = await Community.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Community not found" });

    if (String(group.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only the creating teacher can delete this community" });
    }

    await Community.deleteOne({ _id: group._id });
    cacheDeletePrefix("communities:");

    res.json({ success: true, message: "Community deleted" });
  } catch (e) {
    console.error("Delete community error:", e);
    res.status(500).json({ success: false, message: "Unable to delete community" });
  }
};

module.exports = {
  getCommunities,
  createCommunity,
  getCommunity,
  addPost,
  addMember,
  removeMember,
  joinCommunity,
  updateCommunity,
  deleteCommunity,
};
