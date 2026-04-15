import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("security.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'FamilyMember'
  );

  CREATE TABLE IF NOT EXISTS cameras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'Online'
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cameraId INTEGER NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cameraId) REFERENCES cameras (id)
  );
`);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-123";

app.use(cors());
app.use(express.json());

// Middleware: Auth
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---
app.post("/auth/register", async (req, res) => {
  const { name, email, password, role = 'FamilyMember' } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const info = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(name, email, hashedPassword, role);
    res.status(201).json({ id: info.lastInsertRowid, name, email, role });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Registration failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// --- CAMERA ROUTES ---
app.get("/cameras", authenticateToken, (req: any, res) => {
  const role = req.user.role;
  let cameras;
  if (role === 'SecurityGuard') {
    cameras = db.prepare("SELECT * FROM cameras WHERE location IN ('Front Door', 'Garage', 'Driveway', 'Backyard')").all();
  } else {
    cameras = db.prepare("SELECT * FROM cameras").all();
  }
  res.json(cameras);
});

app.post("/cameras", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: "Admin access required" });
  const { name, location } = req.body;
  const info = db.prepare("INSERT INTO cameras (name, location) VALUES (?, ?)").run(name, location);
  
  // Generate a "Camera Connected" alert
  db.prepare("INSERT INTO alerts (cameraId, message) VALUES (?, ?)").run(info.lastInsertRowid, `Camera '${name}' connected at ${location}`);
  
  res.status(201).json({ id: info.lastInsertRowid, name, location, status: 'Online' });
});

app.delete("/cameras/:id", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: "Admin access required" });
  const { id } = req.params;
  const camera: any = db.prepare("SELECT * FROM cameras WHERE id = ?").get(id);
  
  if (!camera) return res.status(404).json({ error: "Camera not found" });

  db.prepare("DELETE FROM alerts WHERE cameraId = ?").run(id);
  db.prepare("DELETE FROM cameras WHERE id = ?").run(id);
  res.json({ message: "Camera removed" });
});

app.put("/cameras/:id", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: "Admin access required" });
  const { id } = req.params;
  const { name, location, status } = req.body;
  
  const camera: any = db.prepare("SELECT * FROM cameras WHERE id = ?").get(id);
  if (!camera) return res.status(404).json({ error: "Camera not found" });

  db.prepare("UPDATE cameras SET name = ?, location = ?, status = ? WHERE id = ?").run(name, location, status, id);
  
  db.prepare("INSERT INTO alerts (cameraId, message) VALUES (?, ?)").run(id, `Camera '${name}' updated (Status: ${status})`);
  
  res.json({ id: parseInt(id, 10), name, location, status });
});

// --- ALERT ROUTES ---
app.get("/alerts", authenticateToken, (req: any, res) => {
  const role = req.user.role;
  let alerts;
  if (role === 'SecurityGuard') {
    alerts = db.prepare(`
      SELECT a.*, c.name as cameraName 
      FROM alerts a 
      JOIN cameras c ON a.cameraId = c.id 
      WHERE c.location IN ('Front Door', 'Garage', 'Driveway', 'Backyard')
      ORDER BY a.timestamp DESC 
      LIMIT 50
    `).all();
  } else {
    alerts = db.prepare(`
      SELECT a.*, c.name as cameraName 
      FROM alerts a 
      JOIN cameras c ON a.cameraId = c.id 
      ORDER BY a.timestamp DESC 
      LIMIT 50
    `).all();
  }
  res.json(alerts);
});

// --- STREAM ENDPOINT (SIMULATED) ---
app.get("/stream/:cameraId", authenticateToken, (req: any, res) => {
  const { cameraId } = req.params;
  const camera: any = db.prepare("SELECT * FROM cameras WHERE id = ?").get(cameraId);
  if (!camera) return res.status(404).json({ error: "Camera not found" });
  
  if (req.user.role === 'SecurityGuard' && !['Front Door', 'Garage', 'Driveway', 'Backyard'].includes(camera.location)) {
    return res.status(403).json({ error: "Access denied to this camera" });
  }

  res.json({ streamUrl: `ws://localhost:3000/stream/${cameraId}`, status: "Ready" });
});

// --- USER MANAGEMENT ENDPOINT ---
app.get("/users", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: "Admin access required" });
  const users = db.prepare("SELECT id, name, email, role FROM users").all();
  res.json(users);
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
