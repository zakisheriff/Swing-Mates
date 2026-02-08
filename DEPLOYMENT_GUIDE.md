# Swing Mates - Free Deployment Guide

This guide will walk you through deploying your **Backend** to **Hugging Face Spaces** (Free Docker Hosting) and your **Frontend** to **Vercel** (Free Static Hosting).

---

## Part 1: Backend Deployment (Hugging Face Spaces)

We will use Hugging Face Spaces to host your Node.js server for free. It provides a persistent Docker container, which is perfect for Socket.IO.

### Prerequisites
1.  Create a free account at [huggingface.co](https://huggingface.co/join).

### Steps
1.  **Create a New Space**:
    *   Go to configured [New Space](https://huggingface.co/new-space).
    *   **Space Name**: `swing-mates-server` (or similar).
    *   **License**: `MIT` (or your choice).
    *   **SDK**: Select `Docker`.
    *   **Space Hardware**: Select `Free` (2 vCPU, 16GB RAM).
    *   **Privacy**: `Public` (easiest) or `Private`.
    *   Click **Create Space**.

2.  **Upload Server Code**:
    *   You will be redirected to your new Space.
    *   Click on the **Files** tab.
    *   Click **Add file** -> **Upload files**.
    *   Drag and drop the contents of your `server/` folder **directly into the root** of the Space.
        *   **Crucial**: The `Dockerfile` must be in the root of the Space, along with `package.json` and `index.js`.
        *   *Note: Do NOT upload `node_modules`.*
    *   Click **Commit changes to main**.

3.  **Wait for Build**:
    *   Click on the **App** tab.
    *   You will be see "Building". Wait for it to change to "Running".
    *   Once running, you will see your server logs (e.g., "SERVER RUNNING ON PORT 7860").

4.  **Get Your Backend URL**:
    *   Click the **Embed this space** button (top right) -> **Direct URL**.
    *   Copy the URL. It will look like: `https://username-space-name.hf.space`.
    *   **Save this URL**. You need it for the frontend.

---

## Part 2: Frontend Deployment (Vercel)

We will use Vercel to host your Expo web app.

### Prerequisites
1.  Create a free account at [vercel.com](https://vercel.com/signup).
2.  Install Vercel CLI (optional but recommended): `npm install -g vercel`.

### Steps
1.  **Configure Environment Variable**:
    *   In your local project (`swing-mates`), open `.env` (create it if it doesn't exist).
    *   Add:
        ```env
        EXPO_PUBLIC_SERVER_URL=https://your-huggingface-url.hf.space
        ```
    *   *Replace the URL with the one you copied in Part 1.*

2.  **Build for Web**:
    *   Run the command:
        ```bash
        npm run build:web
        ```
    *   This will create a `dist/` folder with your static website.

3.  **Deploy to Vercel**:
    *   **Option A (CLI - Recommended)**:
        *   Run `vercel` in your terminal.
        *   Follow the prompts:
            *   Set up and deploy? `Y`
            *   Which scope? (Select your account)
            *   Link to existing project? `N`
            *   Project name? `swing-mates`
            *   In which directory is your code located? `./`
            *   **Auto-detected Project Settings (Expo)**: It might detect Expo. If it asks for build command, use `npm run build:web`. If it asks for Output Directory, use `dist`.
            *   **Crucial Step**: If it asks to override settings, select Yes for **Output Directory** and set it to `dist`.
    *   **Option B (Dashboard)**:
        *   Push your code to GitHub.
        *   Go to Vercel Dashboard -> **Add New...** -> **Project**.
        *   Import your repository.
        *   **Environment Variables**: Add `EXPO_PUBLIC_SERVER_URL` with your backend URL.
        *   **Build & Development Settings**:
            *   **Output Directory**: `dist`
            *   **Build Command**: `npm run build:web`
        *   Click **Deploy**.

4.  **Verify**:
    *   Visit your new Vercel URL.
    *   Try creating a room. It should connect to your Hugging Face backend!

---

## Troubleshooting

-   **Backend Connection Error**: Ensure your Hugging Face space is "Running" and "Public" (if you want to avoid auth headers). If Private, you face CORS issues unless you configure tokens. **Public is recommended for this project.**
-   **CORS Error**: The server is configured with `cors: { origin: "*" }`, so it should accept connections from Vercel.
-   **White Screen on Vercel**: Ensure the **Output Directory** is set to `dist` in Vercel settings.
