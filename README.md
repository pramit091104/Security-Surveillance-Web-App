# Home Security Surveillance App

## Setup Instructions

1. **Install Dependencies**
   The environment automatically handles dependency installation. If needed, run:
   ```bash
   npm install
   ```

2. **Environment Variables**
   The app uses a default JWT secret. You can customize it in `.env`.
   ```env
   JWT_SECRET=your_secret_here
   ```

3. **Database**
   The app uses SQLite (`security.db`). It is automatically initialized on the first run.

4. **Start the Application**
   ```bash
   npm run dev
   ```
   The server will start on port 3000.

5. **Access the App**
   Open the App URL provided in the AI Studio preview.

## Features
- **User Authentication**: Secure login and registration with JWT.
- **Camera Management**: Add and remove cameras with custom names and locations.
- **Live Monitoring**: Real-time webcam access for connected cameras.
- **Alert System**: Automatic alerts for camera connections and status changes.
- **Responsive Dashboard**: Optimized for both desktop and mobile viewing.
