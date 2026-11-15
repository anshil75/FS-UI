
const mongoose = require("mongoose");
const Report = require("../models/Report");
const User = require("../models/User");
const { getGridFSBucket } = require("../config/gridfs");

// Helper: upload image to GridFS
const uploadImageToGridFS = (file, userId, tenantId) => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(file.originalname, {
      metadata: { contentType: file.mimetype, uploadedBy: userId, tenantId },
    });
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.end(file.buffer);
  });
};

// Create a new campus report
const createReport = async (req, res) => {
  try {
    const { title, description, category, location, priority } = req.body;

    if (!title || !description || !category || !location) {
      return res.status(400).json({
        success: false,
        message: "Title, description, category and location are required",
      });
    }

    // Upload images if provided
    const imageIds = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const id = await uploadImageToGridFS(file, req.user._id, req.campus?._id);
        imageIds.push(id);
      }
    }

    const report = await Report.create({
      title,
      description,
      category,
      location,
      priority: priority || "Medium",
      reportedBy: req.user._id,
      images: imageIds,
      assignedTeam: ({Electrical:"Electrical Team",Cleanliness:"Housekeeping Team",Safety:"Security Team",Vandalism:"Security Team",Damage:"Maintenance Team",Maintenance:"Maintenance Team",Furniture:"Furniture Team",Littering:"Housekeeping Team"})[category] || "General Support",
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report,
    });
  } catch (error) {
    console.error("Create report error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create report",
    });
  }
};

// Serve a report image (authenticated, tenant-scoped)

// Serve a report image (authenticated and tenant-scoped)
const getReportImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image ID",
      });
    }

    const tenantId = req.campus?._id;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        message: "Campus context missing",
      });
    }

    const bucket = getGridFSBucket();
    const objectId = new mongoose.Types.ObjectId(imageId);

    const file = await bucket.find({ _id: objectId }).next();

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    if (
      !file.metadata?.tenantId ||
      String(file.metadata.tenantId) !== String(tenantId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const contentType = file.metadata?.contentType;

    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      return res.status(415).json({
        success: false,
        message: "Unsupported image format",
      });
    }

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "private, max-age=3600");
    res.set("X-Content-Type-Options", "nosniff");

    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.on("error", (error) => {
      console.error("Report image stream error:", error);

      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          message: "Image file could not be retrieved",
        });
      } else {
        res.destroy(error);
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Get report image error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Unable to retrieve image",
      });
    }
  }
};


// Get reports with pagination and filters

const getReports = async (req, res) => {
  try {
    if (!["Admin", "Teacher"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin and Teachers can view campus reports.",
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    if (req.query.search?.trim()) {
      const safeSearch = req.query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const regex = new RegExp(safeSearch, "i");

      filter.$or = [
        { reportId: regex },
        { title: regex },
        { description: regex },
        { category: regex },
        { location: regex },
        { assignedTeam: regex },
        { status: regex },
      ];
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("reportedBy", "name email role")
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      Report.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch reports",
    });
  }
};


// Get logged-in user's reports
const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({
      reportedBy: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch your reports",
    });
  }
};

// Get one report

const getReportById = async (req, res) => {
  try {
    if (!["Admin", "Teacher"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin and Teachers can access reports.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await Report.findById(id)
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Get report by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch report",
    });
  }
};

// Admin assigns a report to an internal support department/team, never to a teacher.
const assignReportTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTeam } = req.body;
    const allowedTeams = [
      "Maintenance Team", "Electrical Team", "Housekeeping Team",
      "Furniture Team", "Security Team", "General Support"
    ];
    if (!mongoose.Types.ObjectId.isValid(id) || !allowedTeams.includes(assignedTeam)) {
      return res.status(400).json({ success: false, message: "Valid report ID and support team are required" });
    }
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    report.assignedTeam = assignedTeam;
    report.status = "Assigned";
    await report.save();
    return res.json({ success: true, message: "Report assigned to support team", report });
  } catch (error) {
    console.error("Assign report team error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to assign report" });
  }
};

// Admin updates status
const updateReportStatus = async (req, res) => {
  try {
    if (req.user.role !== "Admin") return res.status(403).json({ success: false, message: "Only Admin can update report status" });
    const { id } = req.params;
    const { status, resolutionNote } = req.body;

    const allowedStatuses = [
      "Under Review",
      "In Progress",
      "Resolved",
      "Rejected",
    ];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report status",
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }


    report.status = status;

    if (status === "Resolved") {
      report.resolutionNote = resolutionNote || "";
      report.resolvedAt = new Date();
    }

    await report.save();

    return res.status(200).json({
      success: true,
      message: "Report status updated successfully",
      report,
    });
  } catch (error) {
    console.error("Update report error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update report status",
    });
  }
};

module.exports = {
  createReport,
  getReportImage,
  getReports,
  getMyReports,
  getReportById,
  assignReportTeam,
  updateReportStatus,
};
