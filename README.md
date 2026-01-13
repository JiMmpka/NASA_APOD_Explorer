# NASA APOD Explorer 🌌

A web application that displays NASA's Astronomy Picture of the Day (APOD). Explore the cosmos with daily stunning images and videos from space, complete with scientific explanations!

## 🌐 Live Demo

**[View Live Demo →](https://nasa-apod-explorer-3oku.onrender.com/random)**

> Note: The app may take 30 seconds to wake up on first load (free tier hosting).

## Features

- 🌟 **Today's Picture** - View today's astronomy picture of the day
- 📅 **Date Selection** - Browse NASA's image archive from June 16, 1995 to today
- 🎲 **Random Picture** - Discover random astronomical images
- 🖼️ **High Resolution** - Click on images to view in full HD quality
- 🎥 **Video Support** - Watch embedded space videos when available
- 📖 **Scientific Descriptions** - Read detailed explanations written by professional astronomers
- 📊 **API Rate Limits** - Real-time monitoring of API usage (1000 requests/hour)
- 🎨 **Glassmorphism UI** - Modern, translucent design with "Deep Space" theme
- 📱 **Responsive Design** - Works perfectly on mobile, tablet, and desktop
- ✨ **Interactive Elements** - Smooth animations, custom scrollbars, and hover effects

## Technologies Used

- **Backend**: Node.js, Express.js
- **Templating**: EJS
- **HTTP Client**: Axios
- **API**: NASA APOD API
- **Environment Variables**: dotenv
- **Styling**: Custom CSS3 (Variables, Flexbox, Grid, Glassmorphism)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/nasa-apod-explorer.git
cd nasa-apod-explorer
```

2. Install dependencies:
```bash
npm install
```

3. Get your FREE NASA API key:
   - Visit [https://api.nasa.gov/](https://api.nasa.gov/)
   - Enter your email (instant activation)
   - You'll receive a personal API key with 1000 requests/hour

4. Create a `.env` file in the root directory:
```env
NASA_API_KEY=your_api_key_here
PORT=3000
```

5. Start the server:
```bash
node index.js
```

6. Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
nasa-apod-explorer/
├── index.js              # Main server file with API logic
├── package.json          # Dependencies
├── .env                  # Environment variables (not in repo)
├── .env.example          # Template for .env file
├── public/
│   └── styles/
│       └── main.css      # Custom space-themed styles
└── views/
    ├── index.ejs         # Main page with APOD display
    ├── about.ejs         # About page
    └── partials/         # Reusable UI components
        ├── header.ejs
        └── footer.ejs
```

## API Integration & Technical Details

This project uses the official [NASA APOD API](https://api.nasa.gov/) to fetch astronomy pictures.

- **Data Source**: Real-time fetching from NASA's servers (no database required).
- **Archive Range**: Access to all photos since June 16, 1995.
- **Media Types**: Supports both high-definition images and embedded videos.
- **Error Handling**: Robust handling of invalid dates, API rate limits (429), and network errors.
- **Rate Limits**: The app tracks your hourly usage (1,000 requests/hour with a personal key).

## Future Enhancements

- 💾 Save favorite APODs
- 🔍 Search by keywords in descriptions
- 📥 Download images in various resolutions
- 🌙 Dark/Light theme toggle
- 📱 Progressive Web App (PWA) support

## API Credits

All astronomical images and data provided by:
- **NASA** - National Aeronautics and Space Administration
- **APOD** - Astronomy Picture of the Day program
- API: [https://api.nasa.gov/](https://api.nasa.gov/)

## License

This project is open source and available under the MIT License.