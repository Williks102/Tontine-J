import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import os from "os";

const sourceDbPath = path.join(process.cwd(), "tontine.db");
const targetDbPath = path.join(os.tmpdir(), "tontine.db");

if (fs.existsSync(sourceDbPath) && !fs.existsSync(targetDbPath)) {
  try {
    fs.copyFileSync(sourceDbPath, targetDbPath);
    console.log("Found existing tontine.db at root, copied to writable /tmp location.");
  } catch (copyErr) {
    console.error("Could not copy tontine.db to writeable directory:", copyErr);
  }
}

const db = new Database(targetDbPath);

const JWT_SECRET = process.env.JWT_SECRET || "tontine-pro-secret-key-123456";

const getUserIdFromRequest = (req: any): string | null => {
  const authHeader = req.headers['authorization'] as string;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && (decoded.id || decoded.userId)) {
        return decoded.id || decoded.userId;
      }
    } catch (err) {
      console.warn("JWT verification error:", err);
    }
  }
  return (req.headers['user-id'] as string) || null;
};

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    firstName TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password TEXT,
    password_hash TEXT,
    selfieUrl TEXT,
    balance REAL DEFAULT 0,
    referralCode TEXT NOT NULL UNIQUE,
    referredBy TEXT,
    role TEXT DEFAULT 'user',
    isBanned INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stake INTEGER NOT NULL,
    commissionRate REAL DEFAULT 0.1,
    maxMembers INTEGER DEFAULT 10,
    currentMembersCount INTEGER DEFAULT 0,
    durationDays INTEGER DEFAULT 30,
    status TEXT DEFAULT 'open', -- open, active, completed, deleted
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    groupId TEXT NOT NULL,
    userId TEXT NOT NULL,
    positions INTEGER DEFAULT 1, -- 1 or 2 arms
    payoutOrder INTEGER,
    joinedAt TEXT NOT NULL,
    FOREIGN KEY(groupId) REFERENCES groups(id),
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    groupId TEXT NOT NULL,
    userId TEXT NOT NULL,
    amount INTEGER NOT NULL,
    commission INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    timestamp TEXT NOT NULL,
    FOREIGN KEY(groupId) REFERENCES groups(id),
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    isAdmin INTEGER DEFAULT 0,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS my_cards (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    dailyAmount INTEGER NOT NULL,
    totalDays INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS card_payments (
    id TEXT PRIMARY KEY,
    cardId TEXT NOT NULL,
    dayIndex INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    paidAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    isCommission BOOLEAN DEFAULT 0,
    FOREIGN KEY(cardId) REFERENCES my_cards(id),
    UNIQUE(cardId, dayIndex)
  );
`);

// Safe migration for existing DBs if they lack columns
try {
  db.exec("ALTER TABLE users ADD COLUMN password TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT;");
  console.log("Successfully migrated database to include password_hash column.");
} catch (e) {}

const normalizePhone = (phone: string) => phone.replace(/[\s\(\)\-\.]/g, '');

// Seed Admin if it doesn't exist
const adminExists = db.prepare("SELECT * FROM users WHERE phone = '0000'").get();
if (!adminExists) {
  console.log("Seeding default admin user...");
  try {
    db.prepare("INSERT INTO users (id, firstName, phone, referralCode, role) VALUES (?, ?, ?, ?, ?)")
      .run("admin-001", "Admin", "0000", "PRO-ADMIN", "admin");
  } catch (e) {
    console.error("Failed to seed admin:", e);
  }
}

// Seed a test user for the user's convenience
const testUserExists = db.prepare("SELECT * FROM users WHERE phone = '+22501010101'").get();
if (!testUserExists) {
  try {
    db.prepare("INSERT INTO users (id, firstName, phone, referralCode, role) VALUES (?, ?, ?, ?, ?)")
      .run("test-001", "Koffi", "+22501010101", "PRO-KOFFI", "user");
  } catch (e) {}
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // Support base64 selfies

  // --- Ma Carte API ---
  app.get("/api/my-cards", (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    
    try {
      const cards = db.prepare("SELECT * FROM my_cards WHERE userId = ? ORDER BY createdAt DESC").all(userId) as any[];
      const cardsWithPayments = cards.map(card => {
        const payments = db.prepare("SELECT * FROM card_payments WHERE cardId = ? ORDER BY dayIndex ASC").all(card.id);
        return { ...card, payments };
      });
      res.json(cardsWithPayments);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/my-cards", (req, res) => {
    const userId = getUserIdFromRequest(req);
    const { title, dailyAmount, totalDays } = req.body;
    if (!userId) return res.status(401).json({ error: "Non autorisé" });

    const id = `card_${Math.random().toString(36).substr(2, 9)}`;
    try {
      db.prepare("INSERT INTO my_cards (id, userId, title, dailyAmount, totalDays) VALUES (?, ?, ?, ?, ?)")
        .run(id, userId, title, dailyAmount, totalDays);
      res.json({ id, title, dailyAmount, totalDays, payments: [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/my-cards/:id/pay", (req, res) => {
    const userId = getUserIdFromRequest(req);
    const cardId = req.params.id;
    const { dayIndex } = req.body;

    try {
      const card = db.prepare("SELECT * FROM my_cards WHERE id = ?").get(cardId) as any;
      if (!card || card.userId !== userId) return res.status(404).json({ error: "Carte non trouvée" });

      // Commission logic: last day paid is commission
      const isCommission = dayIndex === (card.totalDays - 1) ? 1 : 0;
      const paymentId = `pay_${Math.random().toString(36).substr(2, 9)}`;

      db.prepare("INSERT INTO card_payments (id, cardId, dayIndex, amount, isCommission) VALUES (?, ?, ?, ?, ?)")
        .run(paymentId, cardId, dayIndex, card.dailyAmount, isCommission);
      
      if (isCommission) {
        db.prepare("UPDATE my_cards SET status = 'completed' WHERE id = ?").run(cardId);
      }

      res.json({ success: true, isCommission });
    } catch (e: any) {
      console.error("Payment error:", e.message);
      res.status(500).json({ error: "Paiement déjà effectué ou erreur serveur" });
    }
  });

  // --- Logger Middleware ---
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // --- API Routes ---

  // Auth / User
  app.post("/api/register", (req, res) => {
    let { firstName, phone, password, selfieUrl } = req.body;
    firstName = firstName?.trim();
    const cleanPhone = normalizePhone(phone || '');
    if (!firstName || !cleanPhone) {
      return res.status(400).json({ error: "Prénom et téléphone requis" });
    }

    const id = Math.random().toString(36).substr(2, 9);
    const role = firstName?.toLowerCase() === 'admin' ? 'admin' : 'user';
    const myReferralCode = `PRO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    console.log(`Registering user: ${firstName} (${cleanPhone}) - Role: ${role}`);

    try {
      const existing = db.prepare("SELECT * FROM users WHERE phone = ?").get(cleanPhone);
      if (existing) {
        return res.status(400).json({ error: "Ce numéro de téléphone est déjà utilisé." });
      }

      // Hash password using bcryptjs
      const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

      const stmt = db.prepare("INSERT INTO users (id, firstName, phone, password, password_hash, selfieUrl, referralCode, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      stmt.run(id, firstName, cleanPhone, password || null, passwordHash, selfieUrl, myReferralCode, role);
      
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
      
      // Sign JWT token
      const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        token: token,
        phone: user.phone,
        user: user
      });
    } catch (error: any) {
      console.error(`Registration error for ${cleanPhone}:`, error.message);
      res.status(500).json({ error: "Une erreur est survenue lors de l'enregistrement." });
    }
  });

  app.post("/api/login", (req, res) => {
    const { phone, password } = req.body;
    const cleanPhone = normalizePhone(phone || '');
    console.log(`Login attempt for phone: [${cleanPhone}]`);
    const user = db.prepare("SELECT * FROM users WHERE phone = ?").get(cleanPhone) as any;
    if (user) {
      if (user.isBanned) {
        return res.status(403).json({ error: "Votre compte a été banni. Veuillez contacter l'administration." });
      }

      if (password) {
        let isMatch = false;
        if (user.password_hash) {
          isMatch = bcrypt.compareSync(password, user.password_hash);
        } else if (user.password) {
          isMatch = (user.password === password);
        } else {
          isMatch = true; // allow password-less fallback if no password exists yet
        }

        if (!isMatch) {
          return res.status(400).json({ error: "Mot de passe incorrect" });
        }
      }

      console.log(`Login success for: ${cleanPhone}`);
      
      // Sign JWT token
      const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        token: token,
        phone: user.phone,
        user: user
      });
    } else {
      console.warn(`Login failed: user not found for [${cleanPhone}]`);
      res.status(404).json({ error: "Utilisateur non trouvé" });
    }
  });

  app.get("/api/users/me", (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
      res.json(user);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Groups
  app.get("/api/groups", (req, res) => {
    const groups = db.prepare("SELECT * FROM groups WHERE status = 'open'").all();
    res.json(groups);
  });

  app.get("/api/groups/:id", (req, res) => {
    const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(req.params.id) as any;
    if (!group) {
      return res.status(404).json({ error: "Groupe introuvable" });
    }
    const members = db.prepare(`
      SELECT gm.*, u.firstName, u.phone, u.selfieUrl 
      FROM group_members gm 
      JOIN users u ON gm.userId = u.id 
      WHERE gm.groupId = ?
    `).all(req.params.id);
    res.json({ ...group, members });
  });

  app.post("/api/groups/join", (req, res) => {
    const { groupId, positions } = req.body; // positions: 1 or 2
    let userId = req.body.userId || getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as any;
    
    if (!group || group.status !== 'open') {
      return res.status(400).json({ error: "Ce groupe n'est plus ouvert." });
    }

    if (group.currentMembersCount + positions > group.maxMembers) {
      return res.status(400).json({ error: "Pas assez de places disponibles." });
    }

    const id = Math.random().toString(36).substr(2, 9);
    const joinedAt = new Date().toISOString();

    try {
      db.transaction(() => {
        db.prepare("INSERT INTO group_members (id, groupId, userId, positions, joinedAt) VALUES (?, ?, ?, ?, ?)")
          .run(id, groupId, userId, positions, joinedAt);
        
        db.prepare("UPDATE groups SET currentMembersCount = currentMembersCount + ? WHERE id = ?")
          .run(positions, groupId);

        const updatedGroup = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as any;
        if (updatedGroup.currentMembersCount >= updatedGroup.maxMembers) {
          db.prepare("UPDATE groups SET status = 'active' WHERE id = ?").run(groupId);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:userId/groups", (req, res) => {
    let userId = req.params.userId;
    if (userId === 'me') {
      userId = getUserIdFromRequest(req) as string;
    }
    if (!userId) {
      return res.status(401).json({ error: "Non autorisé" });
    }
    const groups = db.prepare(`
      SELECT g.*, gm.positions, gm.joinedAt 
      FROM groups g 
      JOIN group_members gm ON g.id = gm.groupId 
      WHERE gm.userId = ?
    `).all(userId);
    res.json(groups);
  });

  // Support
  app.get("/api/messages/:userId", (req, res) => {
    let userId = req.params.userId;
    if (userId === 'me') {
      userId = getUserIdFromRequest(req) as string;
    }
    if (!userId) {
      return res.status(401).json({ error: "Non autorisé" });
    }
    const messages = db.prepare("SELECT * FROM messages WHERE userId = ? ORDER BY timestamp ASC").all(userId);
    res.json(messages);
  });

  app.post("/api/messages", (req, res) => {
    const headerUserId = getUserIdFromRequest(req);
    const { userId, type, content, isAdmin } = req.body;
    const finalUserId = userId || headerUserId;
    if (!finalUserId) {
      return res.status(401).json({ error: "Non autorisé" });
    }
    const id = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();

    try {
      const stmt = db.prepare("INSERT INTO messages (id, userId, type, content, isAdmin, timestamp) VALUES (?, ?, ?, ?, ?, ?)");
      stmt.run(id, finalUserId, type, content, isAdmin ? 1 : 0, timestamp);
      res.json({ id, userId: finalUserId, type, content, isAdmin, timestamp });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin Endpoints
  app.get("/api/admin/stats", (req, res) => {
    console.log("Admin Stats request received");
    try {
      const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const totalGroups = db.prepare("SELECT COUNT(*) as count FROM groups WHERE status != 'deleted'").get() as any;
      
      // Commissions from standard Tontines
      const tontineCommissions = db.prepare("SELECT SUM(commission) as sum FROM payments WHERE status = 'completed'").get() as any;
      
      // Commissions from Ma Carte (the last payment is commission)
      const cardCommissions = db.prepare("SELECT SUM(amount) as sum FROM card_payments WHERE isCommission = 1").get() as any;
      
      const totalComMoney = (tontineCommissions?.sum || 0) + (cardCommissions?.sum || 0);

      console.log(`Stats generated: Users:${totalUsers?.count || 0}, Groups:${totalGroups?.count || 0}, Comms:${totalComMoney}`);
      
      res.json({
        totalUsers: totalUsers?.count || 0,
        totalTontines: totalGroups?.count || 0,
        totalMoney: totalComMoney
      });
    } catch (error: any) {
      console.error("Admin stats error:", error.message);
      res.status(500).json({ error: "Erreur serveur statistiques: " + error.message });
    }
  });

  app.post("/api/admin/groups", (req, res) => {
    const { name, stake, maxMembers, durationDays } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();

    try {
      db.prepare("INSERT INTO groups (id, name, stake, maxMembers, durationDays, createdAt) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, name, stake, maxMembers || 10, durationDays || 30, createdAt);
      res.json({ id, name, stake, maxMembers, durationDays, status: 'open' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/groups/:id", (req, res) => {
    try {
      db.prepare("UPDATE groups SET status = 'deleted' WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/users/:userId/ban", (req, res) => {
    const { isBanned } = req.body;
    try {
      db.prepare("UPDATE users SET isBanned = ? WHERE id = ?").run(isBanned ? 1 : 0, req.params.userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/users/:userId/history", (req, res) => {
    const payments = db.prepare(`
      SELECT p.*, g.name as groupName 
      FROM payments p 
      JOIN groups g ON p.groupId = g.id 
      WHERE p.userId = ? 
      ORDER BY p.timestamp DESC
    `).all(req.params.userId);
    res.json(payments);
  });

  app.get("/api/admin/users", (req, res) => {
    console.log("Admin: Fetching all users");
    try {
      const users = db.prepare("SELECT * FROM users ORDER BY firstName ASC").all();
      res.json(users || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/tontines", (req, res) => {
    console.log("Admin: Fetching all tontines");
    try {
      const tontines = db.prepare(`
        SELECT g.*
        FROM groups g
        WHERE g.status != 'deleted'
        ORDER BY g.createdAt DESC
      `).all();
      res.json(tontines || []);
    } catch (error: any) {
      console.error("Admin tontines error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/messages", (req, res) => {
    const messages = db.prepare(`
      SELECT m.*, u.firstName as userName 
      FROM messages m 
      JOIN users u ON m.userId = u.id 
      ORDER BY m.timestamp DESC 
      LIMIT 100
    `).all();
    res.json(messages);
  });

  // --- Vite / Static Files ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
