
require("dotenv").config();

const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const API_SECRET = process.env.API_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !API_SECRET) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// --------------------------------------------------
// API KEY AUTHENTICATION
// --------------------------------------------------

function authenticate(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== API_SECRET) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid API key"
    });
  }

  next();
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Traffic Light API is running"
  });
});

// --------------------------------------------------
// POST: STORE TRAFFIC LIGHT JSON DATA
// --------------------------------------------------

app.post("/api/traffic", authenticate, async (req, res) => {
  try {
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON payload"
      });
    }

    const { data, error } = await supabase
      .from("traffic_logs")
      .insert({
        payload: payload
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to save traffic data"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Traffic data saved successfully",
      record: data
    });

  } catch (error) {
    console.error("POST error:", error.message);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// --------------------------------------------------
// GET: RETRIEVE TRAFFIC DATA
// --------------------------------------------------

app.get("/api/traffic", authenticate, async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit) || 50, 1),
      500
    );

    const { data, error } = await supabase
      .from("traffic_logs")
      .select("id, created_at, payload")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Supabase select error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve traffic data"
      });
    }

    res.json({
      success: true,
      count: data.length,
      data: data
    });

  } catch (error) {
    console.error("GET error:", error.message);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// --------------------------------------------------
// GET: LATEST TRAFFIC RECORD
// --------------------------------------------------

app.get("/api/traffic/latest", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("traffic_logs")
      .select("id, created_at, payload")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`Traffic Light API running on port ${PORT}`);
});
