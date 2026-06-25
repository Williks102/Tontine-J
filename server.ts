import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import os from "os";
import dotenv from "dotenv";

dotenv.config();

const getDatabasePath = (): string => {
  const rootPath = path.join(process.cwd(), "tontine.db");
  const srcPath = path.join(process.cwd(), "src", "tontine.db");
  const tmpPath = path.join(os.tmpdir(), "tontine.db");

  // Try root path first
  try {
    const testDb = new Database(rootPath);
    testDb.exec("CREATE TABLE IF NOT EXISTS _write_test (id INTEGER PRIMARY KEY);");
    testDb.exec("DROP TABLE _write_test;");
    testDb.close();
    console.log("Using persistent SQLite database at root: " + rootPath);
    return rootPath;
  } catch (err) {
    console.log("Root directory is read-only, trying /src path...");
  }

  // Try /src path
  try {
    const testDb = new Database(srcPath);
    testDb.exec("CREATE TABLE IF NOT EXISTS _write_test (id INTEGER PRIMARY KEY);");
    testDb.exec("DROP TABLE _write_test;");
    testDb.close();
    console.log("Using persistent SQLite database inside /src: " + srcPath);
    return srcPath;
  } catch (err) {
    console.log("src directory is read-only, falling back to /tmp...");
  }

  // Fallback to /tmp which is always writable in Cloud Run but ephemeral
  const sourceDbPath = path.join(process.cwd(), "tontine.db");
  if (fs.existsSync(sourceDbPath) && !fs.existsSync(tmpPath)) {
    try {
      fs.copyFileSync(sourceDbPath, tmpPath);
      console.log("Found existing tontine.db at root, copied to writable /tmp location.");
    } catch (copyErr) {
      console.error("Could not copy tontine.db to writeable directory:", copyErr);
    }
  }
  console.log("Using ephemeral SQLite database in /tmp: " + tmpPath);
  return tmpPath;
};

const db = new Database(getDatabasePath());

const JWT_SECRET = process.env.JWT_SECRET || "tontine-pro-secret-key-123456";
if (JWT_SECRET === "tontine-pro-secret-key-123456") {
  console.warn("⚠️  Avertissement de Sécurité: Utilisation du secret JWT codé en dur par défaut. Veuillez configurer JWT_SECRET dans votre .env");
}

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
  return null;
};

const adminMiddleware = (req: any, res: any, next: any) => {
  const adminId = getUserIdFromRequest(req);
  if (!adminId) {
    return res.status(401).json({ error: "Non autorisé. Jeton de connexion invalide." });
  }
  try {
    const adminUser = db.prepare("SELECT role, firstName FROM users WHERE id = ?").get(adminId) as any;
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: "Accès refusé. Droits administrateur requis." });
    }
    req.adminId = adminId;
    req.adminUser = adminUser;
    next();
  } catch (err: any) {
    console.error("Erreur middleware admin:", err.message);
    res.status(500).json({ error: "Erreur interne de vérification de permissions." });
  }
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

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS system_logs (
    id TEXT PRIMARY KEY,
    action TEXT,
    details TEXT,
    timestamp TEXT
  );
`);

// Seed default settings if empty
const hasSettings = db.prepare("SELECT COUNT(*) as count FROM system_settings").get() as any;
if (!hasSettings || hasSettings.count === 0) {
  console.log("Seeding default system settings...");
  const defaultSettings = [
    { key: 'commission_rate', value: '10' }, // 10%
    { key: 'withdrawal_limit', value: '500000' }, // 500,000 F CFA
    { key: 'min_deposit', value: '500' },
    { key: 'max_deposit', value: '1000000' },
    { key: 'formulas_config', value: JSON.stringify([
      { id: 'tontine_classique', name: 'Tontine Classique', stake: 1000, durationDays: 10, maxMembers: 10 },
      { id: 'tontine_argent', name: 'Tontine Argent', stake: 5000, durationDays: 30, maxMembers: 10 },
      { id: 'tontine_or', name: 'Tontine Or', stake: 10000, durationDays: 30, maxMembers: 10 }
    ])}
  ];
  const insertSetting = db.prepare("INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)");
  for (const s of defaultSettings) {
    insertSetting.run(s.key, s.value);
  }

  db.prepare("INSERT INTO system_logs (id, action, details, timestamp) VALUES (?, ?, ?, ?)")
    .run(
      `log_${Math.random().toString(36).substr(2, 9)}`,
      "Initialisation système",
      "Paramètres par défaut initialisés avec succès",
      new Date().toISOString()
    );
}

// Safe migration for existing DBs if they lack columns
try {
  db.exec("ALTER TABLE users ADD COLUMN password TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT;");
  console.log("Successfully migrated database to include password_hash column.");
} catch (e) {}

const normalizePhone = (phone: string) => phone.replace(/[\s\(\)\-\.]/g, '');

const getPlatformStatsSummary = (database: any) => {
  const usersRow = database.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  const totalUsers = usersRow?.count || 0;

  const activeGroupsRow = database.prepare("SELECT COUNT(*) as count FROM groups WHERE status = 'active'").get() as any;
  const activeGroupsCount = activeGroupsRow?.count || 0;

  const openGroupsRow = database.prepare("SELECT COUNT(*) as count FROM groups WHERE status = 'open'").get() as any;
  const openGroupsCount = openGroupsRow?.count || 0;

  const totalGroupsRow = database.prepare("SELECT COUNT(*) as count FROM groups WHERE status != 'deleted'").get() as any;
  const totalGroupsCount = totalGroupsRow?.count || 0;

  const circulatingVolumeRow = database.prepare(`
    SELECT SUM(gm.positions * g.stake) as sum 
    FROM group_members gm
    JOIN groups g ON gm.groupId = g.id
    WHERE g.status != 'deleted'
  `).get() as any;
  const totalVolumeCirculating = circulatingVolumeRow?.sum || 0;

  const tontineComVal = database.prepare("SELECT SUM(commission) as sum FROM payments WHERE status = 'completed'").get() as any;
  const tontineCommissions = tontineComVal?.sum || 0;

  const cardComVal = database.prepare("SELECT SUM(amount) as sum FROM card_payments WHERE isCommission = 1").get() as any;
  const cardCommissions = cardComVal?.sum || 0;

  const totalCommissions = tontineCommissions + cardCommissions;

  return {
    totalUsers,
    activeGroupsCount,
    openGroupsCount,
    totalGroupsCount,
    totalVolumeCirculating,
    tontineCommissions,
    cardCommissions,
    totalCommissions
  };
};

// Seed Admin if it doesn't exist
const adminPhone = normalizePhone(process.env.ADMIN_PHONE || "0000");
const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";
const adminPasswordHash = bcrypt.hashSync(adminPassword, 10);

const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin' OR phone = ?").get(adminPhone) as any;
if (!adminExists) {
  console.log(`Seeding default admin user (Phone: ${adminPhone})...`);
  try {
    db.prepare("INSERT INTO users (id, firstName, phone, password, password_hash, referralCode, role) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run("admin-001", "Admin", adminPhone, adminPassword, adminPasswordHash, "PRO-ADMIN", "admin");
    console.log("Admin user seeded successfully with hashed password.");
  } catch (e) {
    console.error("Failed to seed admin:", e);
  }
} else {
  // Ensure existing admin is synced with environment settings
  try {
    const defaultAdmin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get() as any;
    if (defaultAdmin && (!defaultAdmin.password_hash || defaultAdmin.phone !== adminPhone)) {
      console.log("Updating admin settings to match environment configuration...");
      db.prepare("UPDATE users SET phone = ?, password = ?, password_hash = ? WHERE id = ?")
        .run(adminPhone, adminPassword, adminPasswordHash, defaultAdmin.id);
    }
  } catch (e) {
    console.error("Failed to update admin credentials at startup:", e);
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

// Seed default tontine groups if the groups table is empty
try {
  const groupsCountResult = db.prepare("SELECT COUNT(*) as count FROM groups WHERE status != 'deleted'").get() as any;
  const groupsCount = groupsCountResult ? groupsCountResult.count : 0;
  if (groupsCount === 0) {
    console.log("Seeding default tontine groups...");
    const defaultGroups = [
      {
        id: "group-alimentaire-01",
        name: "Tontine Alimentaire Sereine",
        stake: 5000,
        maxMembers: 15,
        durationDays: 180,
      },
      {
        id: "group-cash-01",
        name: "Tontine Cash Rapide",
        stake: 1000,
        maxMembers: 10,
        durationDays: 30,
      },
      {
        id: "group-babymama-01",
        name: "Tontine Baby Mama Douceur",
        stake: 5000,
        maxMembers: 12,
        durationDays: 90,
      },
      {
        id: "group-school-01",
        name: "Tontine School Rentrée Sûre",
        stake: 5000,
        maxMembers: 20,
        durationDays: 180,
      }
    ];

    const stmt = db.prepare("INSERT INTO groups (id, name, stake, maxMembers, durationDays, createdAt) VALUES (?, ?, ?, ?, ?, ?)");
    for (const g of defaultGroups) {
      try {
        stmt.run(g.id, g.name, g.stake, g.maxMembers, g.durationDays, new Date().toISOString());
      } catch (e) {
        console.error("Failed to seed default group:", g.name, e);
      }
    }
  }
} catch (groupSeedError) {
  console.error("Failed to check or seed groups:", groupSeedError);
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
    const { id, title, dailyAmount, totalDays } = req.body;
    if (!userId) return res.status(401).json({ error: "Non autorisé" });

    const cardId = id || `card_${Math.random().toString(36).substr(2, 9)}`;
    const sanitizedTitle = (title || "Ma Tontine Journalière").trim();
    const sanitizedAmount = parseInt(String(dailyAmount)) || 5000;
    const sanitizedDays = parseInt(String(totalDays)) || 31;

    try {
      db.prepare("INSERT INTO my_cards (id, userId, title, dailyAmount, totalDays) VALUES (?, ?, ?, ?, ?)")
        .run(cardId, userId, sanitizedTitle, sanitizedAmount, sanitizedDays);
      res.json({ id: cardId, title: sanitizedTitle, dailyAmount: sanitizedAmount, totalDays: sanitizedDays, payments: [] });
    } catch (e: any) {
      console.error("Database error creating card:", e);
      res.status(500).json({ error: e.message || "Erreur interne de la base de données" });
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

  app.delete("/api/my-cards/:id", (req, res) => {
    const userId = getUserIdFromRequest(req);
    const cardId = req.params.id;
    if (!userId) return res.status(401).json({ error: "Non autorisé" });

    try {
      const card = db.prepare("SELECT * FROM my_cards WHERE id = ?").get(cardId) as any;
      if (!card || card.userId !== userId) return res.status(404).json({ error: "Carte non trouvée" });

      // Delete payments first
      db.prepare("DELETE FROM card_payments WHERE cardId = ?").run(cardId);
      // Delete card
      db.prepare("DELETE FROM my_cards WHERE id = ?").run(cardId);

      res.json({ success: true });
    } catch (e: any) {
      console.error("Card deletion error:", e.message);
      res.status(500).json({ error: e.message });
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
    let { firstName, phone, password, selfieUrl, referredByCode } = req.body;
    firstName = firstName?.trim();
    const cleanPhone = normalizePhone(phone || '');
    if (!firstName || !cleanPhone) {
      return res.status(400).json({ error: "Prénom et téléphone requis" });
    }

    const id = Math.random().toString(36).substr(2, 9);
    const role = 'user'; // Users registered via the sign up form are always standard users
    const myReferralCode = `PRO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    console.log(`Registering user: ${firstName} (${cleanPhone}) - Role: ${role} - ReferredByCode: ${referredByCode}`);

    try {
      const existing = db.prepare("SELECT * FROM users WHERE phone = ?").get(cleanPhone);
      if (existing) {
        return res.status(400).json({ error: "Ce numéro de téléphone est déjà utilisé." });
      }

      // Hash password using bcryptjs
      const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

      let validatedReferredBy = null;
      if (referredByCode) {
        const refCode = String(referredByCode).trim().toUpperCase();
        const referrer = db.prepare("SELECT id, firstName FROM users WHERE UPPER(referralCode) = ?").get(refCode) as any;
        if (referrer) {
          validatedReferredBy = referrer.id;
          console.log(`User referred by: ${referrer.firstName} (ID: ${referrer.id})`);
          
          // Silently reward the referrer user active signup bonus (e.g. 1,000 F or whatever we configured)
          db.prepare("UPDATE users SET balance = balance + 500 WHERE id = ?").run(referrer.id);
        }
      }

      const stmt = db.prepare("INSERT INTO users (id, firstName, phone, password, password_hash, selfieUrl, referralCode, role, referredBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      stmt.run(id, firstName, cleanPhone, password || null, passwordHash, selfieUrl, myReferralCode, role, validatedReferredBy);
      
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
    let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(cleanPhone) as any;
    
    if (!user) {
      console.log(`User [${cleanPhone}] not found. Seamlessly auto-registering for sandbox testing...`);
      const id = Math.random().toString(36).substr(2, 9);
      const referralCode = `PRO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const name = "Épargnant " + (cleanPhone.length >= 4 ? cleanPhone.slice(-4) : cleanPhone);
      const passwordHash = password ? bcrypt.hashSync(password, 10) : null;
      try {
        db.prepare(
          "INSERT INTO users (id, firstName, phone, password, password_hash, referralCode, role, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(id, name, cleanPhone, password || null, passwordHash, referralCode, 'user', 100000); // 100 000 FCFA initial demo balance
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
      } catch (err: any) {
        console.error("Auto-registration error during login fallback:", err.message);
      }
    }

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
      console.warn(`Login failed: user not found even after auto-registration attempt for [${cleanPhone}]`);
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

  app.get("/api/global/stats", (req, res) => {
    try {
      const summary = getPlatformStatsSummary(db);
      res.json(summary);
    } catch (err: any) {
      console.error("Error generating global summary stats:", err.message);
      res.status(500).json({ error: "Erreur lors du calcul des statistiques globales: " + err.message });
    }
  });

  // Referrals
  app.get("/api/referrals", (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

      const referrals = db.prepare(`
        SELECT id, firstName, phone, balance, role,
        (SELECT COUNT(*) FROM group_members WHERE userId = users.id) as groupCount
        FROM users 
        WHERE referredBy = ? OR referredBy = ?
        ORDER BY id DESC
      `).all(userId, user.referralCode) as any[];

      const totalEarned = referrals.reduce((sum, r) => {
        const activeBonus = r.groupCount > 0 ? 1500 : 0;
        const signupBonus = 500;
        return sum + signupBonus + activeBonus;
      }, 0);

      res.json({
        referralCode: user.referralCode,
        totalEarned,
        referrals: referrals.map(r => ({
          id: r.id,
          firstName: r.firstName,
          phone: r.phone,
          status: r.groupCount > 0 ? 'actif' : 'inscrit',
          date: new Date().toLocaleDateString('fr-FR'),
          bonus: 500 + (r.groupCount > 0 ? 1500 : 0)
        }))
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Groups
  app.get("/api/groups", (req, res) => {
    const groups = db.prepare("SELECT * FROM groups WHERE status = 'open' OR status = 'active'").all();
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
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Non autorisé. Jeton requis." });
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

        // Add payment record for tontine join with commission tracked (10% standard admin fee)
        const amount = group.stake * positions;
        const commission = Math.round((group.stake * 0.1) * positions);
        const paymentId = `pay_group_${Math.random().toString(36).substr(2, 9)}`;
        db.prepare("INSERT INTO payments (id, groupId, userId, amount, commission, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(paymentId, groupId, userId, amount, commission, 'completed', joinedAt);

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
    const authUserId = getUserIdFromRequest(req);
    if (!authUserId) {
      return res.status(401).json({ error: "Non autorisé. Connexion requise." });
    }

    let userId = req.params.userId;
    if (userId === 'me') {
      userId = authUserId;
    }

    // Protection IDOR: Only admin or the user themselves can view their group membership details
    if (userId !== authUserId) {
      const requester = db.prepare("SELECT role FROM users WHERE id = ?").get(authUserId) as any;
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé. Vous ne pouvez pas consulter les tontines d'un autre utilisateur." });
      }
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
    const authUserId = getUserIdFromRequest(req);
    if (!authUserId) {
      return res.status(401).json({ error: "Non autorisé. Connexion requise." });
    }

    let userId = req.params.userId;
    if (userId === 'me') {
      userId = authUserId;
    }

    // Protection IDOR: Only the user or an administrative account can fetch private support channels
    if (userId !== authUserId) {
      const requester = db.prepare("SELECT role FROM users WHERE id = ?").get(authUserId) as any;
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé. Vous ne pouvez pas lire les messages d'un autre utilisateur." });
      }
    }

    const messages = db.prepare("SELECT * FROM messages WHERE userId = ? ORDER BY timestamp ASC").all(userId);
    res.json(messages);
  });

  app.post("/api/messages", (req, res) => {
    const headerUserId = getUserIdFromRequest(req);
    if (!headerUserId) {
      return res.status(401).json({ error: "Non autorisé. Connexion requise." });
    }

    const { userId, type, content, isAdmin } = req.body;
    
    // Check if requester has admin permissions
    const requester = db.prepare("SELECT role FROM users WHERE id = ?").get(headerUserId) as any;
    const isRequesterAdmin = requester && requester.role === 'admin';

    let finalUserId = headerUserId;
    let finalIsAdmin = 0;

    if (isRequesterAdmin) {
      // Admins are trusted to post to whoever they choose and can label messages as admin
      finalUserId = userId || headerUserId;
      finalIsAdmin = isAdmin ? 1 : 0;
    } else {
      // Non-admins are forced to write as themselves with no administrative privilege spoofing
      finalUserId = headerUserId;
      finalIsAdmin = 0;
    }

    const id = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();

    try {
      const stmt = db.prepare("INSERT INTO messages (id, userId, type, content, isAdmin, timestamp) VALUES (?, ?, ?, ?, ?, ?)");
      stmt.run(id, finalUserId, type, content, finalIsAdmin, timestamp);
      res.json({ id, userId: finalUserId, type, content, isAdmin: finalIsAdmin, timestamp });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin Endpoints - Globally secure all subpaths
  app.use("/api/admin", adminMiddleware);
  app.use("/api/admin/*", adminMiddleware);
  app.get("/api/admin/stats", (req, res) => {
    console.log("Admin Stats request received");
    try {
      const summary = getPlatformStatsSummary(db);

      // Fetch list of card commissions with details
      const cardComList = db.prepare(`
        SELECT 
          'card' as type,
          cp.id,
          cp.amount, 
          cp.paidAt as timestamp, 
          mc.title as sourceName, 
          u.firstName as userFirstName, 
          u.phone as userPhone, 
          u.selfieUrl as userSelfie 
        FROM card_payments cp 
        JOIN my_cards mc ON cp.cardId = mc.id 
        JOIN users u ON mc.userId = u.id 
        WHERE cp.isCommission = 1
      `).all() as any[];

      // Fetch list of standard group commissions with details
      const groupComList = db.prepare(`
        SELECT 
          'group' as type,
          p.id,
          p.commission as amount, 
          p.timestamp, 
          g.name as sourceName, 
          u.firstName as userFirstName, 
          u.phone as userPhone, 
          u.selfieUrl as userSelfie 
        FROM payments p 
        JOIN groups g ON p.groupId = g.id 
        JOIN users u ON p.userId = u.id
        WHERE p.commission > 0
      `).all() as any[];

      // Merge and sort commissions by date descending
      const commissionsHistory = [...cardComList, ...groupComList].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      console.log(`Stats generated via SSOT: Users:${summary.totalUsers}, Groups:${summary.totalGroupsCount}, Comms:${summary.totalCommissions}`);
      
      res.json({
        totalUsers: summary.totalUsers,
        totalTontines: summary.totalGroupsCount,
        totalMoney: summary.totalCommissions,
        cardComTotal: summary.cardCommissions,
        tontineComTotal: summary.tontineCommissions,
        activeGroupsCount: summary.activeGroupsCount,
        openGroupsCount: summary.openGroupsCount,
        totalVolumeCirculating: summary.totalVolumeCirculating,
        commissionsHistory
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
    console.log("Admin: Fetching all tontines with members details");
    try {
      const tontines = db.prepare(`
        SELECT g.*
        FROM groups g
        WHERE g.status != 'deleted'
        ORDER BY g.createdAt DESC
      `).all() as any[];

      const tontinesWithDetails = tontines.map(g => {
        const members = db.prepare(`
          SELECT gm.*, u.firstName, u.phone, u.selfieUrl 
          FROM group_members gm 
          JOIN users u ON gm.userId = u.id 
          WHERE gm.groupId = ?
          ORDER BY gm.joinedAt ASC
        `).all(g.id);

        const payments = db.prepare(`
          SELECT p.*, u.firstName, u.phone 
          FROM payments p 
          JOIN users u ON p.userId = u.id 
          WHERE p.groupId = ?
          ORDER BY p.timestamp ASC
        `).all(g.id);

        return { ...g, members, payments };
      });

      res.json(tontinesWithDetails || []);
    } catch (error: any) {
      console.error("Admin tontines detailed error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/groups/:id/members", (req, res) => {
    const groupId = req.params.id;
    const { userId, positions } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "L'identifiant du membre (userId) est requis." });
    }
    const numPositions = parseInt(String(positions)) || 1;

    try {
      const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as any;
      if (!group || group.status === 'deleted') {
        return res.status(404).json({ error: "Groupe introuvable." });
      }

      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
      if (!user) {
        return res.status(404).json({ error: "Utilisateur introuvable." });
      }

      if (group.currentMembersCount + numPositions > group.maxMembers) {
        return res.status(400).json({ error: "Nombre de bras maximum dépassé pour ce groupe." });
      }

      const id = `gm_${Math.random().toString(36).substr(2, 9)}`;
      const joinedAt = new Date().toISOString();

      db.transaction(() => {
        db.prepare("INSERT INTO group_members (id, groupId, userId, positions, joinedAt) VALUES (?, ?, ?, ?, ?)")
          .run(id, groupId, userId, numPositions, joinedAt);

        db.prepare("UPDATE groups SET currentMembersCount = currentMembersCount + ? WHERE id = ?")
          .run(numPositions, groupId);

        const amount = group.stake * numPositions;
        const commission = Math.round((group.stake * 0.1) * numPositions);
        const paymentId = `pay_group_${Math.random().toString(36).substr(2, 9)}`;
        db.prepare("INSERT INTO payments (id, groupId, userId, amount, commission, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(paymentId, groupId, userId, amount, commission, 'completed', joinedAt);

        const updatedGroup = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as any;
        if (updatedGroup.currentMembersCount >= updatedGroup.maxMembers) {
          db.prepare("UPDATE groups SET status = 'active' WHERE id = ?").run(groupId);
        }
      })();

      res.json({ success: true });
    } catch (e: any) {
      console.error("Admin enroll user to group error:", e);
      res.status(500).json({ error: e.message || "Erreur lors de l'inscription au groupe." });
    }
  });

  app.delete("/api/admin/groups/:id/members/:memberId", (req, res) => {
    const groupId = req.params.id;
    const memberId = req.params.memberId;
    
    try {
      const member = db.prepare("SELECT * FROM group_members WHERE id = ? AND groupId = ?").get(memberId, groupId) as any;
      if (!member) {
        return res.status(404).json({ error: "Membre de groupe introuvable." });
      }

      const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as any;
      if (!group) {
        return res.status(404).json({ error: "Groupe introuvable." });
      }

      db.transaction(() => {
        db.prepare("DELETE FROM group_members WHERE id = ?").run(memberId);

        const newCount = Math.max(0, group.currentMembersCount - member.positions);
        const newStatus = (newCount < group.maxMembers && group.status === 'active') ? 'open' : group.status;
        db.prepare("UPDATE groups SET currentMembersCount = ?, status = ? WHERE id = ?")
          .run(newCount, newStatus, groupId);

        db.prepare("DELETE FROM payments WHERE groupId = ? AND userId = ?").run(groupId, member.userId);
      })();

      res.json({ success: true });
    } catch (e: any) {
      console.error("Admin remove member from group error:", e);
      res.status(500).json({ error: e.message || "Erreur lors de l'exclusion du groupe." });
    }
  });

  app.post("/api/admin/groups/:id/status", (req, res) => {
    const groupId = req.params.id;
    const { status } = req.body;
    try {
      db.prepare("UPDATE groups SET status = ? WHERE id = ?").run(status, groupId);
      res.json({ success: true, status });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
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

  // --- Admin Cards API ---
  app.get("/api/admin/cards", (req, res) => {
    try {
      const cards = db.prepare(`
        SELECT mc.*, u.firstName as userFirstName, u.phone as userPhone, u.selfieUrl as userSelfie 
        FROM my_cards mc 
        JOIN users u ON mc.userId = u.id 
        ORDER BY mc.createdAt DESC
      `).all() as any[];
      const cardsWithPayments = cards.map(card => {
        const payments = db.prepare("SELECT * FROM card_payments WHERE cardId = ? ORDER BY dayIndex ASC").all(card.id);
        return { ...card, payments };
      });
      res.json(cardsWithPayments);
    } catch (e: any) {
      console.error("Admin cards fetch error:", e.message);
      res.status(500).json({ error: e.message || "Erreur lors du chargement des cartes" });
    }
  });

  app.post("/api/admin/cards", (req, res) => {
    const { userId, title, dailyAmount, totalDays } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "L'identifiant de membre (userId) est requis" });
    }

    const cardId = `card_${Math.random().toString(36).substr(2, 9)}`;
    const sanitizedTitle = (title || "Ma Tontine Journalière").trim();
    const sanitizedAmount = parseInt(String(dailyAmount)) || 5000;
    const sanitizedDays = parseInt(String(totalDays)) || 31;

    try {
      const userExists = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      if (!userExists) {
        return res.status(404).json({ error: "Membre non trouvé" });
      }

      db.prepare("INSERT INTO my_cards (id, userId, title, dailyAmount, totalDays) VALUES (?, ?, ?, ?, ?)")
        .run(cardId, userId, sanitizedTitle, sanitizedAmount, sanitizedDays);
      res.json({ id: cardId, userId, title: sanitizedTitle, dailyAmount: sanitizedAmount, totalDays: sanitizedDays, payments: [] });
    } catch (e: any) {
      console.error("Database error admin creating card:", e);
      res.status(500).json({ error: e.message || "Erreur lors de la création de la carte" });
    }
  });

  app.delete("/api/admin/cards/:id", (req, res) => {
    const cardId = req.params.id;
    try {
      db.prepare("DELETE FROM card_payments WHERE cardId = ?").run(cardId);
      db.prepare("DELETE FROM my_cards WHERE id = ?").run(cardId);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Admin delete card error:", e.message);
      res.status(500).json({ error: e.message || "Erreur de suppression" });
    }
  });

  // --- Admin Referrals API ---
  app.get("/api/admin/referrals", (req, res) => {
    const adminId = getUserIdFromRequest(req);
    if (!adminId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const adminUser = db.prepare("SELECT role FROM users WHERE id = ?").get(adminId) as any;
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé" });
      }

      // Read relations
      const allRelations = db.prepare(`
        SELECT u.id as childId, u.firstName as childName, u.phone as childPhone, u.selfieUrl as childSelfie,
               p.id as parentId, p.firstName as parentName, p.phone as parentPhone,
               (SELECT COUNT(*) FROM group_members WHERE userId = u.id) as childGroupCount
        FROM users u
        LEFT JOIN users p ON u.referredBy = p.id OR u.referredBy = p.referralCode
        WHERE u.referredBy IS NOT NULL AND u.referredBy != ''
        ORDER BY u.id DESC
      `).all() as any[];

      // Aggregations of Top referrers
      const topReferrers = db.prepare(`
        SELECT p.id, p.firstName, p.phone, p.referralCode, COUNT(u.id) as referralCount,
               SUM(CASE WHEN (SELECT COUNT(*) FROM group_members WHERE userId = u.id) > 0 THEN 2000 ELSE 500 END) as rewardsEarned
        FROM users u
        JOIN users p ON u.referredBy = p.id OR u.referredBy = p.referralCode
        WHERE u.referredBy IS NOT NULL AND u.referredBy != ''
        GROUP BY p.id
        ORDER BY referralCount DESC
      `).all() as any[];

      res.json({
        relations: allRelations,
        topReferrers
      });
    } catch (e: any) {
      console.error("Admin referrals fetch error:", e.message);
      res.status(500).json({ error: e.message || "Erreur de chargement" });
    }
  });

  // --- Admin Settings and System Logs API ---
  app.get("/api/admin/settings", (req, res) => {
    const adminId = getUserIdFromRequest(req);
    if (!adminId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const adminUser = db.prepare("SELECT role FROM users WHERE id = ?").get(adminId) as any;
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé" });
      }

      const rows = db.prepare("SELECT * FROM system_settings").all() as any[];
      const settingsMap: Record<string, string> = {};
      for (const row of rows) {
        settingsMap[row.key] = row.value;
      }
      res.json(settingsMap);
    } catch (e: any) {
      console.error("Fetch settings error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/settings", (req, res) => {
    const adminId = getUserIdFromRequest(req);
    if (!adminId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const adminUser = db.prepare("SELECT role, firstName FROM users WHERE id = ?").get(adminId) as any;
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé" });
      }

      const updates = req.body;
      const keys = Object.keys(updates);
      const updateStmt = db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)");
      
      db.transaction(() => {
        for (const key of keys) {
          const val = typeof updates[key] === 'object' ? JSON.stringify(updates[key]) : String(updates[key]);
          updateStmt.run(key, val);
          
          // Log it
          db.prepare("INSERT INTO system_logs (id, action, details, timestamp) VALUES (?, ?, ?, ?)")
            .run(
              `log_${Math.random().toString(36).substr(2, 9)}`,
              `Modification: ${key}`,
              `Par ${adminUser.firstName}. Nouvelle valeur: ${val.substring(0, 150)}`,
              new Date().toISOString()
            );
        }
      })();

      res.json({ success: true });
    } catch (e: any) {
      console.error("Update settings error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/logs", (req, res) => {
    const adminId = getUserIdFromRequest(req);
    if (!adminId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const adminUser = db.prepare("SELECT role FROM users WHERE id = ?").get(adminId) as any;
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé" });
      }

      const logs = db.prepare("SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 100").all();
      res.json(logs);
    } catch (e: any) {
      console.error("Fetch system logs error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Admin list & role promotion endpoint
  app.get("/api/admin/administrators", (req, res) => {
    const adminId = getUserIdFromRequest(req);
    if (!adminId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const adminUser = db.prepare("SELECT role FROM users WHERE id = ?").get(adminId) as any;
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé" });
      }

      const admins = db.prepare("SELECT id, firstName, phone, role FROM users WHERE role = 'admin'").all();
      res.json(admins);
    } catch (e: any) {
      console.error("Fetch admins list error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/administrators/promote", (req, res) => {
    const adminId = getUserIdFromRequest(req);
    if (!adminId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const adminUser = db.prepare("SELECT role, firstName FROM users WHERE id = ?").get(adminId) as any;
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé" });
      }

      const { phone, firstName } = req.body;
      const cleanPhone = normalizePhone(phone || '');
      if (!cleanPhone) {
        return res.status(400).json({ error: "Numéro de téléphone requis" });
      }

      let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(cleanPhone) as any;
      if (user) {
        db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
        
        db.prepare("INSERT INTO system_logs (id, action, details, timestamp) VALUES (?, ?, ?, ?)")
          .run(
            `log_${Math.random().toString(36).substr(2, 9)}`,
            "Promotion Administrateur",
            `${adminUser.firstName} a promu ${user.firstName} (${cleanPhone}) au rôle admin`,
            new Date().toISOString()
          );
      } else {
        // Create brand new admin
        const id = `admin_${Math.random().toString(36).substr(2, 9)}`;
        const referralCode = `PRO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const name = firstName || "Admin Associé";
        db.prepare("INSERT INTO users (id, firstName, phone, referralCode, role) VALUES (?, ?, ?, ?, 'admin')")
          .run(id, name, cleanPhone, referralCode);

        db.prepare("INSERT INTO system_logs (id, action, details, timestamp) VALUES (?, ?, ?, ?)")
          .run(
            `log_${Math.random().toString(36).substr(2, 9)}`,
            "Création Administrateur",
            `${adminUser.firstName} a créé l'administrateur ${name} (${cleanPhone})`,
            new Date().toISOString()
          );
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error("Promote admin error:", e);
      res.status(500).json({ error: e.message });
    }
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
