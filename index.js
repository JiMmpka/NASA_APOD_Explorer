import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// NASA APOD API - Astronomy Picture of the Day
const API_URL = "https://api.nasa.gov/planetary/apod";
const API_KEY = process.env.NASA_API_KEY;

// Validate API key exists
if (!API_KEY) {
  console.error("❌ ERROR: NASA_API_KEY not found in environment variables!");
  console.error("🔑 Please create a .env file with your NASA API key");
  console.error("📝 See .env.example for template");
  process.exit(1);
}

// Rate limiting info
const RATE_LIMIT = {
  hourly: 1000,    // 1000 requests per hour with personal API key
  daily: 1000,     // No daily limit, but we'll track hourly resets
  hourlyCount: 0,
  dailyCount: 0,
  hourlyResetTime: new Date(Date.now() + 60 * 60 * 1000),
  dailyResetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
};

// Function to check and update rate limits
function updateRateLimit() {
  const now = new Date();
  
  // Reset hourly counter
  if (now >= RATE_LIMIT.hourlyResetTime) {
    RATE_LIMIT.hourlyCount = 0;
    RATE_LIMIT.hourlyResetTime = new Date(Date.now() + 60 * 60 * 1000);
  }
  
  // Reset daily counter
  if (now >= RATE_LIMIT.dailyResetTime) {
    RATE_LIMIT.dailyCount = 0;
    RATE_LIMIT.dailyResetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  
  // Increment counters
  RATE_LIMIT.hourlyCount++;
  RATE_LIMIT.dailyCount++;
}

// Function to get remaining requests
function getRemainingRequests() {
  return {
    hourly: Math.max(0, RATE_LIMIT.hourly - RATE_LIMIT.hourlyCount),
    daily: Math.max(0, RATE_LIMIT.daily - RATE_LIMIT.dailyCount)
  };
}

// Middleware
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Set the view engine to EJS
app.set("view engine", "ejs");

// Route to render the home page - Today's APOD
app.get("/", async (req, res) => {
  console.log("📡 GET / - Fetching today's APOD...");
  
  try {
    updateRateLimit();
    console.log(`📊 Rate limit updated - Hourly: ${getRemainingRequests().hourly}/1000`);
    
    const response = await axios.get(API_URL, {
      params: {
        api_key: API_KEY
      }
    });
    
    console.log("✅ Successfully fetched today's APOD:", response.data.title);
    
    res.render("index.ejs", { 
      data: response.data,
      rateLimit: getRemainingRequests(),
      error: null 
    });
  } catch (error) {
    console.error("❌ API Error:", error.message);
    console.error("Error details:", error.response?.data);
    console.error("Status code:", error.response?.status);
    
    let errorMessage = "Failed to fetch today's picture.";
    
    if (error.response?.status === 429) {
      errorMessage = "⚠️ API RATE LIMIT EXCEEDED! Get your FREE personal API key at https://api.nasa.gov/ " +
                     "(email only, instant activation, 1000 requests/hour!). " +
                     "Then add it to your .env file as NASA_API_KEY=your_key_here";
    } else {
      errorMessage += ` ${error.message}`;
    }
    
    res.status(500).render("index.ejs", { 
      data: null,
      rateLimit: getRemainingRequests(),
      error: errorMessage 
    });
  }
});

// Route to handle date selection
app.post("/get-date-picture", async (req, res) => {
  const selectedDate = req.body.date;
  console.log(`📡 POST /get-date-picture - Fetching APOD for date: ${selectedDate}`);
  
  try {
    updateRateLimit();
    console.log(`📊 Rate limit updated - Hourly: ${getRemainingRequests().hourly}/1000`);
    
    const response = await axios.get(API_URL, {
      params: {
        api_key: API_KEY,
        date: selectedDate
      }
    });
    
    console.log("✅ Successfully fetched data for date:", selectedDate, "-", response.data.title);
    
    res.render("index.ejs", { 
      data: response.data,
      rateLimit: getRemainingRequests(),
      error: null 
    });
  } catch (error) {
    console.error("❌ API Error:", error.message);
    console.error("Error details:", error.response?.data);
    console.error("Status code:", error.response?.status);
    
    let errorMessage = `Failed to fetch picture from ${selectedDate}.`;
    
    if (error.response?.status === 429) {
      errorMessage = "⚠️ API RATE LIMIT EXCEEDED! Get your FREE personal API key at https://api.nasa.gov/ " +
                     "(email only, instant activation, 1000 requests/hour!). " +
                     "Then add it to your .env file as NASA_API_KEY=your_key_here";
    } else {
      errorMessage += ` ${error.message}`;
    }
    
    res.status(500).render("index.ejs", { 
      data: null,
      rateLimit: getRemainingRequests(),
      error: error.response?.data?.msg || errorMessage 
    });
  }
});

// Random picture from entire APOD archive (1995-06-16 to today)
app.get("/random", async (req, res) => {
  console.log("📡 GET /random - Fetching random APOD...");
  
  try {
    updateRateLimit();
    // Get random date from entire NASA APOD archive
    const today = new Date();
    const firstAPOD = new Date('1995-06-16'); // First APOD ever published
    
    // Calculate random date between first APOD and today
    const timeDiff = today.getTime() - firstAPOD.getTime();
    const randomTime = firstAPOD.getTime() + Math.floor(Math.random() * timeDiff);
    const randomDate = new Date(randomTime);
    const dateString = randomDate.toISOString().split('T')[0];
    
    console.log(`🎲 Random date selected: ${dateString} (year: ${randomDate.getFullYear()})`);
    console.log(`📊 Rate limit updated - Hourly: ${getRemainingRequests().hourly}/1000`);
    
    const response = await axios.get(API_URL, {
      params: {
        api_key: API_KEY,
        date: dateString
      }
    });
    
    console.log("✅ Successfully fetched random data:", response.data.title);
    
    res.render("index.ejs", { 
      data: response.data,
      rateLimit: getRemainingRequests(),
      error: null 
    });
  } catch (error) {
    console.error("❌ API Error:", error.message);
    console.error("Error details:", error.response?.data);
    console.error("Status code:", error.response?.status);
    
    let errorMessage = "Failed to fetch random picture.";
    
    if (error.response?.status === 429) {
      errorMessage = "⚠️ API RATE LIMIT EXCEEDED! Get your FREE personal API key at https://api.nasa.gov/ " +
                     "(email only, instant activation, 1000 requests/hour!). " +
                     "Then add it to your .env file as NASA_API_KEY=your_key_here";
    } else {
      errorMessage += ` ${error.message}`;
    }
    
    res.status(500).render("index.ejs", { 
      data: null,
      rateLimit: getRemainingRequests(),
      error: errorMessage
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`🌌 Using NASA APOD API for cosmic pictures`);
});
