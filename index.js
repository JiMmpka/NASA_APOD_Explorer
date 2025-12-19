import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import helmet from "helmet";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Security Middleware
app.use(helmet.hidePoweredBy());
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.frameguard({ action: 'deny' }));

// NASA APOD API
const API_URL = "https://api.nasa.gov/planetary/apod";
const API_KEY = process.env.NASA_API_KEY;

if (!API_KEY) {
  console.error("❌ ERROR: NASA_API_KEY not found in environment variables!");
  console.error("🔑 Please create a .env file with your NASA API key");
  console.error("📝 See .env.example for template");
  process.exit(1);
}

// Rate limiting info (Source of Truth: NASA Headers)
const RATE_LIMIT = {
  limit: 1000,
  remaining: 1000,
  resetTime: null
};

function updateRateLimitFromHeaders(headers) {
  if (headers['x-ratelimit-limit']) {
    RATE_LIMIT.limit = parseInt(headers['x-ratelimit-limit']);
  }
  if (headers['x-ratelimit-remaining']) {
    RATE_LIMIT.remaining = parseInt(headers['x-ratelimit-remaining']);
  }
}

// Simple In-Memory Cache
const apodCache = new Map();

function getRemainingRequests() {
  return {
    hourly: RATE_LIMIT.remaining
  };
}

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

// Helper: Fetch APOD data
async function fetchAPOD(date = null) {
  const dateKey = date || new Date().toISOString().split('T')[0];

  if (apodCache.has(dateKey)) {
    console.log(`💾 Cache Hit for ${dateKey}`);
    return apodCache.get(dateKey);
  }

  console.log(`📡 Fetching from NASA API... (Last known remaining: ${RATE_LIMIT.remaining})`);

  const params = { api_key: API_KEY };
  if (date) params.date = date;

  const response = await axios.get(API_URL, { params, timeout: 25000 });
  
  updateRateLimitFromHeaders(response.headers);
  console.log(`📊 Rate limit updated from headers - Remaining: ${RATE_LIMIT.remaining}/${RATE_LIMIT.limit}`);
  
  console.log(`✅ Successfully fetched APOD for ${dateKey}:`, response.data.title);
  
  apodCache.set(response.data.date, response.data);
  if (!date && response.data.date !== dateKey) {
     apodCache.set(dateKey, response.data);
  }

  return response.data;
}

// Helper: Standardized Error Handling
function handleError(res, error, customMessage) {
  console.error("❌ API Error:", error.message);
  if (error.response) {
    console.error("Error details:", error.response.data);
    console.error("Status code:", error.response.status);
  }

  let errorMessage = customMessage;

  if (error.response?.status === 429) {
    errorMessage = "⚠️ API RATE LIMIT EXCEEDED! Get your FREE personal API key at https://api.nasa.gov/";
  } else if (error.response?.status >= 500) {
    errorMessage = "⚠️ NASA Servers are experiencing issues. Please try again later.";
  } else if (error.code === 'ECONNABORTED') {
    errorMessage = "⚠️ Connection timed out. NASA servers are slow to respond.";
  } else {
    errorMessage += ` ${error.message}`;
  }

  res.status(500).render("index.ejs", { 
    data: null,
    error: error.response?.data?.msg || errorMessage 
  });
}

app.get("/", async (req, res) => {
  console.log("📡 GET / - Fetching today's APOD...");
  try {
    const data = await fetchAPOD();
    res.render("index.ejs", { data, error: null });
  } catch (error) {
    handleError(res, error, "Failed to fetch today's picture.");
  }
});

app.post("/get-date-picture", async (req, res) => {
  const selectedDate = req.body.date;
  console.log(`📡 POST /get-date-picture - Fetching APOD for date: ${selectedDate}`);
  
  // Security: Input Validation
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!selectedDate || !dateRegex.test(selectedDate)) {
    return res.render("index.ejs", { data: null, error: "Invalid date format. Please use YYYY-MM-DD." });
  }

  // Security: Date Range Validation
  const inputDate = new Date(selectedDate);
  const minDate = new Date('1995-06-16');
  const today = new Date();
  
  if (inputDate < minDate || inputDate > today) {
    return res.render("index.ejs", { data: null, error: "Date must be between June 16, 1995 and today." });
  }

  try {
    const data = await fetchAPOD(selectedDate);
    res.render("index.ejs", { data, error: null });
  } catch (error) {
    handleError(res, error, `Failed to fetch picture from ${selectedDate}.`);
  }
});

app.get("/random", async (req, res) => {
  console.log("📡 GET /random - Fetching random APOD...");
  
  try {
    const today = new Date();
    const firstAPOD = new Date('1995-06-16');
    const timeDiff = today.getTime() - firstAPOD.getTime();
    const randomTime = firstAPOD.getTime() + Math.floor(Math.random() * timeDiff);
    const randomDate = new Date(randomTime);
    const dateString = randomDate.toISOString().split('T')[0];
    
    console.log(`🎲 Random date selected: ${dateString}`);

    const data = await fetchAPOD(dateString);
    res.render("index.ejs", { data, error: null });
  } catch (error) {
    handleError(res, error, "Failed to fetch random picture.");
  }
});

app.get("/about", (req, res) => {
  console.log("📄 GET /about - Rendering about page");
  res.render("about.ejs", { pageTitle: "About - NASA APOD Explorer" });
});

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`🌌 Using NASA APOD API for cosmic pictures`);
});
