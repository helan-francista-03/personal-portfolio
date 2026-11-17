require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy when deployed behind HTTPS proxy
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Session security settings
const IDLE_TIMEOUT = 15 * 60 * 1000;
const ABSOLUTE_TIMEOUT = 60 * 60 * 1000;

// Required environment variables
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing in .env");
  process.exit(1);
}

if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
  console.error("ADMIN_PASSWORD or SESSION_SECRET is missing in .env");
  process.exit(1);
}

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// Session configuration
app.use(
  session({
    name: "portfolio_admin_session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,

    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60
    }),

    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: IDLE_TIMEOUT
    }
  })
);

// ================================
// MONGODB SCHEMAS
// ================================

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    tech: {
      type: [String],
      default: []
    },
    link: {
      type: String,
      default: ""
    },
    github: {
      type: String,
      default: ""
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);
const Message = mongoose.model("Message", messageSchema);

// ================================
// PASSWORD SECURITY
// ================================

function safePasswordCompare(inputPassword, actualPassword) {
  const input = Buffer.from(String(inputPassword));
  const actual = Buffer.from(String(actualPassword));

  if (input.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(input, actual);
}

// ================================
// SESSION DESTROY FUNCTION
// ================================

function destroyAdminSession(req, res, message) {
  req.session.destroy((err) => {
    res.clearCookie("portfolio_admin_session");

    if (err) {
      return res.status(500).json({
        error: "Could not end session."
      });
    }

    return res.status(401).json({
      error: message
    });
  });
}

// ================================
// ADMIN AUTHENTICATION
// ================================

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({
      error: "Please login first."
    });
  }

  const now = Date.now();

  const createdAt = req.session.createdAt;
  const lastActivityAt = req.session.lastActivityAt;

  if (
    typeof createdAt !== "number" ||
    typeof lastActivityAt !== "number"
  ) {
    return destroyAdminSession(
      req,
      res,
      "Invalid session. Please login again."
    );
  }

  // Absolute timeout: 1 hour
  if (now - createdAt >= ABSOLUTE_TIMEOUT) {
    return destroyAdminSession(
      req,
      res,
      "Session expired. Please login again."
    );
  }

  // Inactivity timeout: 15 minutes
  if (now - lastActivityAt >= IDLE_TIMEOUT) {
    return destroyAdminSession(
      req,
      res,
      "You were inactive. Please login again."
    );
  }

  next();
}

// ================================
// ADMIN LOGIN
// ================================

app.post("/api/admin/login", (req, res, next) => {
  const password = req.body?.password;

  if (typeof password !== "string" || !password) {
    return res.status(400).json({
      error: "Please enter your password."
    });
  }

  if (!safePasswordCompare(password, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({
      error: "Incorrect password."
    });
  }

  // Create a fresh session after login
  req.session.regenerate((err) => {
    if (err) {
      return next(err);
    }

    const now = Date.now();

    req.session.isAdmin = true;
    req.session.createdAt = now;
    req.session.lastActivityAt = now;

    req.session.save((saveError) => {
      if (saveError) {
        return next(saveError);
      }

      res.json({
        success: true,
        message: "Login successful.",
        serverTime: Date.now()
      });
    });
  });
});

// ================================
// ADMIN SESSION STATUS
// ================================

app.get("/api/admin/status", requireAdmin, (req, res) => {
  res.json({
    loggedIn: true,
    serverTime: Date.now(),
    sessionExpiresAt:
      req.session.createdAt + ABSOLUTE_TIMEOUT,
    idleExpiresAt:
      req.session.lastActivityAt + IDLE_TIMEOUT
  });
});

// ================================
// ADMIN HEARTBEAT
// ================================

app.post("/api/admin/heartbeat", requireAdmin, (req, res) => {
  const now = Date.now();

  // Only genuine reported activity refreshes idle time
  const isActive = req.body?.active === true;

  if (isActive) {
    req.session.lastActivityAt = now;
  }

  req.session.save((err) => {
    if (err) {
      return res.status(500).json({
        error: "Could not update session."
      });
    }

    res.json({
      success: true,
      serverTime: Date.now(),
      lastActivityAt: req.session.lastActivityAt,
      sessionExpiresAt:
        req.session.createdAt + ABSOLUTE_TIMEOUT
    });
  });
});

// ================================
// ADMIN LOGOUT
// ================================

app.post("/api/admin/logout", (req, res) => {
  if (!req.session) {
    res.clearCookie("portfolio_admin_session");

    return res.json({
      success: true,
      message: "Logged out."
    });
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: "Could not logout."
      });
    }

    res.clearCookie("portfolio_admin_session");

    res.json({
      success: true,
      message: "Logged out successfully."
    });
  });
});

// ================================
// GET ALL PROJECTS - PUBLIC
// ================================

app.get("/api/projects", async (req, res) => {
  try {
    const projects = await Project.find().sort({
      createdAt: -1
    });

    res.json(projects);
  } catch (error) {
    console.error("Load projects error:", error);

    res.status(500).json({
      error: "Could not load projects."
    });
  }
});

// ================================
// CREATE PROJECT - ADMIN ONLY
// ================================

app.post("/api/projects", requireAdmin, async (req, res) => {
  try {
    const project = await Project.create(req.body);

    res.status(201).json(project);
  } catch (error) {
    console.error("Create project error:", error);

    res.status(400).json({
      error: "Could not create project."
    });
  }
});

// ================================
// UPDATE PROJECT - ADMIN ONLY
// ================================

app.put("/api/projects/:id", requireAdmin, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!project) {
      return res.status(404).json({
        error: "Project not found."
      });
    }

    res.json(project);
  } catch (error) {
    console.error("Update project error:", error);

    res.status(400).json({
      error: "Could not update project."
    });
  }
});

// ================================
// DELETE PROJECT - ADMIN ONLY
// ================================

app.delete("/api/projects/:id", requireAdmin, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(
      req.params.id
    );

    if (!project) {
      return res.status(404).json({
        error: "Project not found."
      });
    }

    res.json({
      success: true,
      message: "Project deleted."
    });
  } catch (error) {
    console.error("Delete project error:", error);

    res.status(400).json({
      error: "Could not delete project."
    });
  }
});

// ================================
// CONTACT FORM - PUBLIC
// ================================

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof message !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: "Please fill in all fields."
      });
    }

    const newMessage = await Message.create({
      name: name.trim(),
      email: email.trim(),
      message: message.trim()
    });

    res.status(201).json({
      success: true,
      message: "Your message has been sent successfully.",
      id: newMessage._id
    });
  } catch (error) {
    console.error("Contact form error:", error);

    res.status(500).json({
      error: "Could not send your message."
    });
  }
});

// ================================
// GET CONTACT MESSAGES - ADMIN ONLY
// ================================

app.get("/api/messages", requireAdmin, async (req, res) => {
  try {
    const messages = await Message.find().sort({
      createdAt: -1
    });

    res.json(messages);
  } catch (error) {
    console.error("Load messages error:", error);

    res.status(500).json({
      error: "Could not load messages."
    });
  }
});

// ================================
// API NOT FOUND
// ================================

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API route not found."
  });
});

// ================================
// ADMIN DASHBOARD PAGE
// ================================

app.get("/admin", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "admin.html")
  );
});

// ================================
// PORTFOLIO WEBSITE
// EXPRESS 5 COMPATIBLE ROUTE
// ================================

app.get("/{*splat}", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// ================================
// CONNECT DATABASE & START SERVER
// ================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(
        `Server running at http://localhost:${PORT}`
      );

      console.log("Admin security system initialized.");
      console.log("Idle timeout: 15 minutes");
      console.log("Absolute timeout: 1 hour");
      console.log("Heartbeat endpoint: /api/admin/heartbeat");
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  });