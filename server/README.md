# Swing Mates Server

Real-time drawing collaboration server for the Swing Mates app.

## Local Development

```bash
npm install
npm run dev
```

## Deployment to DigitalOcean App Platform

### Prerequisites
- DigitalOcean account
- GitHub account (for automatic deployments)

### Steps

1. **Push this server folder to a GitHub repository**
   - You can create a new repo just for the server, or use the main project repo

2. **Create a new App on DigitalOcean**
   - Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Connect your GitHub repository
   - Select the `server` directory as the source

3. **Configure the App**
   - **Type**: Web Service
   - **Run Command**: `npm start`
   - **HTTP Port**: `3000`
   - **Instance Size**: Basic ($5/month) or use free trial credits

4. **Deploy**
   - Click "Deploy" and wait for the build to complete
   - You'll get a URL like: `https://swing-mates-server-xxxxx.ondigitalocean.app`

5. **Update the App**
   - Replace the `SERVER_URL` in `services/socket.ts` with your new DigitalOcean URL

## API Endpoints

- `GET /` - Server status
- `GET /health` - Health check

## Socket.io Events

### Client -> Server
- `join-room` - Join a drawing room
- `draw-stroke` - Send a completed stroke
- `drawing-move` - Live drawing updates
- `undo-stroke` - Undo last stroke
- `clear-canvas` - Clear the canvas
- `send-message` - Send chat message
- `check-room` - Check if room exists

### Server -> Client
- `user-joined` - User joined notification
- `user-left` - User left notification
- `room-users` - List of users in room
- `load-canvas` - Load existing strokes
- `draw-stroke` - Receive stroke from others
- `drawing-move` - Live drawing from others
- `undo-stroke` - Undo notification
- `clear-canvas` - Clear notification
- `receive-message` - Chat message received
