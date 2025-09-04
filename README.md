# Bynder Video Service

A lightweight backend service that returns all streamable Bynder videos associated with a given SKU, designed for Product Detail Pages (PDP) to dynamically show videos when available.

## Features

- Fetches videos from Bynder API filtered by:
  - Video type only
  - Non-expired (client-side filtering)
  - Website usage rights (client-side filtering)
  - Specific SKU matching
- Tests stream accessibility before returning results
- RESTful API with JSON responses
- Health check endpoint
- CORS enabled for frontend consumption

## API Endpoints

### `GET /videos/:sku`
Returns streamable videos for a given SKU.

**Response:**
```json
{
  "sku": "EXAMPLE_SKU",
  "count": 1,
  "videos": [
    {
      "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
      "name": "Example Asset",
      "streamUrl": "https://yourdomain.bynder.com/vod-stream/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/play-hls2.m3u8",
      "thumbnails": {
        "mini": "https://...",
        "webimage": "https://...",
        "thul": "https://..."
      },
      "dateCreated": "2025-09-04T11:00:26Z",
      "dateModified": "2025-09-04T11:22:07Z"
    }
  ],
  "timestamp": "2025-09-04T12:00:00.000Z"
}
```

### `GET /health`
Health check endpoint.

### `GET /`
Service information and available endpoints.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Bynder credentials
   ```

3. Run the server:
   ```bash
   npm run dev  # Development with watch mode
   npm start    # Production
   ```

## Railway Deployment

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard:
   - `BYNDER_TOKEN`
   - `BYNDER_BASE_URL`
3. Deploy automatically triggers on push to main branch

## Environment Variables

- `BYNDER_TOKEN` - Your Bynder API token
- `BYNDER_BASE_URL` - Your Bynder domain URL (e.g., https://yourdomain.bynder.com)
- `PORT` - Server port (defaults to 3000)

## Usage in Frontend

```javascript
// Fetch videos for a product
const response = await fetch(`https://your-railway-app.railway.app/videos/EXAMPLE_SKU`);
const data = await response.json();

if (data.videos.length > 0) {
  // Display videos on PDP
  data.videos.forEach(video => {
    console.log(`Video: ${video.name} - ${video.streamUrl}`);
  });
}
```