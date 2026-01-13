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

  try {
    const response = await axios.get(API_URL, { 
      params, 
      timeout: 30000, 
      family: 4 // Wymuszenie IPv4 (często rozwiązuje problemy z timeoutami na Windowsie)
    });
    
    updateRateLimitFromHeaders(response.headers);
    console.log(`📊 Rate limit updated from headers - Remaining: ${RATE_LIMIT.remaining}/${RATE_LIMIT.limit}`);
    
    console.log(`✅ Successfully fetched APOD for ${dateKey}:`, response.data.title);
    
    apodCache.set(response.data.date, response.data);
    
    if (!date && response.data.date !== dateKey) {
       apodCache.set(dateKey, response.data);
    }

    return response.data;
  } catch (error) {
    // Rzucamy błąd dalej do handlera w routingu
    throw error;
  }
}

// Helper: Standardized Error Handling
function getErrorMessage(error, customMessage) {
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
  return errorMessage;
}

function logError(error) {
  console.error("❌ API Error:", error.message);
  if (error.response) {
    console.error("Error Status:", error.response.status);
    console.error("Error Data:", JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    console.error("❌ No response received from NASA API.");
  }
}

app.get("/", (req, res) => {
  res.render("index.ejs", { data: null, error: null, isLoading: true });
});

app.get("/api/today", async (req, res) => {
  try {
    const data = await fetchAPOD();
    res.json(data);
  } catch (error) {
    logError(error);
    res.status(500).json({ error: getErrorMessage(error, "Failed to fetch today's picture.") });
  }
});

app.post("/get-date-picture", (req, res) => {
  const selectedDate = req.body.date;
  
  // Walidacja daty (przywrócona)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!selectedDate || !dateRegex.test(selectedDate)) {
    return res.render("index.ejs", { data: null, error: "Invalid date format. Please use YYYY-MM-DD.", isLoading: false });
  }

  const inputDate = new Date(selectedDate);
  const minDate = new Date('1995-06-16');
  const today = new Date();
  
  if (inputDate < minDate || inputDate > today) {
    return res.render("index.ejs", { data: null, error: "Date must be between June 16, 1995 and today.", isLoading: false });
  }

  res.render("index.ejs", { data: null, error: null, isLoading: true, initialDate: selectedDate });
});

app.get("/api/date/:date", async (req, res) => {
  try {
    const data = await fetchAPOD(req.params.date);
    res.json(data);
  } catch (error) {
    logError(error);
    res.status(500).json({ error: getErrorMessage(error, `Failed to fetch picture from ${req.params.date}.`) });
  }
});

app.get("/random", (req, res) => {
  // Przerabiamy również random na async po stronie klienta dla spójności
  const today = new Date();
  const firstAPOD = new Date('1995-06-16');
  const timeDiff = today.getTime() - firstAPOD.getTime();
  const randomTime = firstAPOD.getTime() + Math.floor(Math.random() * timeDiff);
  const randomDate = new Date(randomTime);
  const dateString = randomDate.toISOString().split('T')[0];
  
  res.render("index.ejs", { data: null, error: null, isLoading: true, initialDate: dateString });
});

app.get("/about", (req, res) => {
  console.log("📄 GET /about - Rendering about page");
  res.render("about.ejs", { pageTitle: "About - NASA APOD Explorer" });
});

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`🌌 Using NASA APOD API for cosmic pictures`);
});
