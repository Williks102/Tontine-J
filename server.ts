import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { query, camelizeKeys, toPublicUser } from "./lib/db";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "tontine-pro-secret-key-123456";
if (JWT_SECRET === "tontine-pro-secret-key-123456") {
  console.warn("⚠️  Avertissement de Sécurité: Configurez JWT_SECRET dans votre .env");
}

const genId = () => Math.random().toString(36).substr(2, 9);
const normalizePhone = (phone: string) => phone.replace(/[\s\(\)\-\.]/g, '');
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

// Détecte si un identifiant de connexion est un e-mail ou un numéro de téléphone
const isEmailLike = (identifier: string) => identifier.includes('@');

const getUserIdFromRequest = (req: any): string | null => {
  const authHeader = req.headers['authorization'] as string;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return decoded?.id || decoded?.userId || null;
    } catch {
      return null;
    }
  }
  return null;
};

const adminMiddleware = async (req: any, res: any, next: any) => {
  const adminId = getUserIdFromRequest(req);
  if (!adminId) return res.status(401).json({ error: "Non autorisé. Jeton de connexion invalide." });
  try {
    const [adminUser] = await query(`SELECT role, first_name FROM users WHERE id = $1`, [adminId]);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: "Accès refusé. Droits administrateur requis." });
    }
    req.adminId = adminId;
    req.adminUser = { firstName: adminUser.first_name, role: adminUser.role };
    next();
  } catch (err: any) {
    res.status(500).json({ error: "Erreur interne de vérification de permissions." });
  }
};

// --- Seeding au démarrage ---
async function seedIfNeeded() {
  // Settings par défaut
  const [{ count: settingsCount }] = await query(`SELECT COUNT(*)::int AS count FROM system_settings`);
  if (!settingsCount) {
    console.log("Initialisation des paramètres système...");
    const defaultSettings: [string, string][] = [
      ['commission_rate', '10'],
      ['withdrawal_limit', '500000'],
      ['min_deposit', '500'],
      ['max_deposit', '1000000'],
      ['formulas_config', JSON.stringify([
        { id: 'tontine_classique', name: 'Tontine Classique', stake: 1000, durationDays: 10, maxMembers: 10 },
        { id: 'tontine_argent', name: 'Tontine Argent', stake: 5000, durationDays: 30, maxMembers: 10 },
        { id: 'tontine_or', name: 'Tontine Or', stake: 10000, durationDays: 30, maxMembers: 10 }
      ])]
    ];
    for (const [key, value] of defaultSettings) {
      await query(
        `INSERT INTO system_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
      );
    }

    await query(
      `INSERT INTO system_logs (id, action, details, timestamp) VALUES ($1, $2, $3, $4)`,
      [`log_${genId()}`, "Initialisation système", "Paramètres par défaut initialisés avec succès", new Date().toISOString()]
    );
  }

  // Admin par défaut
  const adminPhone = normalizePhone(process.env.ADMIN_PHONE || "0000");
  const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";
  const [adminExists] = await query(`SELECT id FROM users WHERE role = 'admin' OR phone = $1 LIMIT 1`, [adminPhone]);

  if (!adminExists) {
    console.log(`Création de l'admin (Phone: ${adminPhone})...`);
    const hash = bcrypt.hashSync(adminPassword, 10);
    await query(
      `INSERT INTO users (id, first_name, phone, password_hash, referral_code, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['admin-001', 'Admin', adminPhone, hash, 'PRO-ADMIN', 'admin']
    );
  }

  // Utilisateur test (mot de passe par défaut: "test1234")
  const [testExists] = await query(`SELECT id FROM users WHERE phone = $1`, ['+22501010101']);
  if (!testExists) {
    await query(
      `INSERT INTO users (id, first_name, phone, password_hash, referral_code, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['test-001', 'Koffi', '+22501010101', bcrypt.hashSync('test1234', 10), 'PRO-KOFFI', 'user']
    );
  }

  // Groupes par défaut
  const [{ count: groupsCount }] = await query(`SELECT COUNT(*)::int AS count FROM groups WHERE status != 'deleted'`);
  if (!groupsCount) {
    console.log("Création des groupes par défaut...");
    const defaultGroups = [
      { id: 'group-alimentaire-01', name: 'Tontine Alimentaire Sereine', stake: 5000, maxMembers: 15, durationDays: 180 },
      { id: 'group-cash-01', name: 'Tontine Cash Rapide', stake: 1000, maxMembers: 10, durationDays: 30 },
      { id: 'group-babymama-01', name: 'Tontine Baby Mama Douceur', stake: 5000, maxMembers: 12, durationDays: 90 },
      { id: 'group-school-01', name: 'Tontine School Rentrée Sûre', stake: 5000, maxMembers: 20, durationDays: 180 }
    ];
    for (const g of defaultGroups) {
      await query(
        `INSERT INTO groups (id, name, stake, max_members, duration_days, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [g.id, g.name, g.stake, g.maxMembers, g.durationDays, new Date().toISOString()]
      );
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  await seedIfNeeded();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // --- Ma Carte ---

  app.get("/api/my-cards", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const cards = await query(`SELECT * FROM my_cards WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
      const result = await Promise.all(cards.map(async (card: any) => {
        const payments = await query(`SELECT * FROM card_payments WHERE card_id = $1 ORDER BY day_index`, [card.id]);
        return camelizeKeys({ ...card, payments });
      }));
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/my-cards", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    const { id, title, dailyAmount, totalDays } = req.body;
    const cardId = id || `card_${genId()}`;
    const sanitizedTitle = (title || "Ma Tontine Journalière").trim();
    const sanitizedAmount = parseInt(String(dailyAmount)) || 5000;
    const sanitizedDays = parseInt(String(totalDays)) || 31;
    try {
      await query(
        `INSERT INTO my_cards (id, user_id, title, daily_amount, total_days) VALUES ($1, $2, $3, $4, $5)`,
        [cardId, userId, sanitizedTitle, sanitizedAmount, sanitizedDays]
      );
      res.json({ id: cardId, userId, title: sanitizedTitle, dailyAmount: sanitizedAmount, totalDays: sanitizedDays, payments: [] });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/my-cards/:id/pay", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    const cardId = req.params.id;
    const { dayIndex } = req.body;
    try {
      const [card] = await query(`SELECT * FROM my_cards WHERE id = $1`, [cardId]);
      if (!card || card.user_id !== userId) return res.status(404).json({ error: "Carte non trouvée" });

      const [userData] = await query(`SELECT balance FROM users WHERE id = $1`, [userId]);
      if (!userData || (userData.balance || 0) < card.daily_amount) {
        return res.status(400).json({ error: "Solde insuffisant. Rechargez votre compte.", code: "INSUFFICIENT_BALANCE" });
      }

      const isCommission = dayIndex === (card.total_days - 1);
      const paymentId = `pay_${genId()}`;
      await query(
        `INSERT INTO card_payments (id, card_id, day_index, amount, is_commission) VALUES ($1, $2, $3, $4, $5)`,
        [paymentId, cardId, dayIndex, card.daily_amount, isCommission]
      );

      const newBalance = (userData.balance || 0) - card.daily_amount;
      await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);
      await query(
        `INSERT INTO wallet_transactions (id, user_id, type, amount, description, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [`txn_${genId()}`, userId, 'card_payment', -card.daily_amount,
          `Cotisation carte — Jour ${dayIndex + 1}${isCommission ? ' (frais de gestion)' : ''}`,
          'completed', new Date().toISOString()]
      );

      if (isCommission) {
        await query(`UPDATE my_cards SET status = 'completed' WHERE id = $1`, [cardId]);
      }
      res.json({ success: true, isCommission, newBalance });
    } catch (e: any) { res.status(500).json({ error: "Paiement déjà effectué ou erreur serveur" }); }
  });

  app.delete("/api/my-cards/:id", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    const cardId = req.params.id;
    try {
      const [card] = await query(`SELECT * FROM my_cards WHERE id = $1`, [cardId]);
      if (!card || card.user_id !== userId) return res.status(404).json({ error: "Carte non trouvée" });
      await query(`DELETE FROM card_payments WHERE card_id = $1`, [cardId]);
      await query(`DELETE FROM my_cards WHERE id = $1`, [cardId]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- Wallet ---

  app.get("/api/wallet", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const [user] = await query(`SELECT balance FROM users WHERE id = $1`, [userId]);
      const transactions = await query(
        `SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
        [userId]
      );
      res.json({ balance: user?.balance || 0, transactions: transactions.map(camelizeKeys) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/wallet/recharge", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    const amount = parseInt(req.body.amount);
    const phone = (req.body.phone || '').trim();
    if (!amount || amount < 500) return res.status(400).json({ error: "Montant minimum: 500 FCFA" });
    if (amount > 1000000) return res.status(400).json({ error: "Montant maximum: 1 000 000 FCFA" });
    try {
      const [user] = await query(`SELECT balance FROM users WHERE id = $1`, [userId]);
      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
      const newBalance = (user.balance || 0) + amount;
      await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);
      await query(
        `INSERT INTO wallet_transactions (id, user_id, type, amount, description, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [`txn_${genId()}`, userId, 'recharge', amount,
          `Recharge via Mobile Money${phone ? ` (${phone})` : ''}`, 'completed', new Date().toISOString()]
      );
      res.json({ success: true, newBalance, amount });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- Auth / Utilisateurs ---

  app.post("/api/register", async (req, res) => {
    let { firstName, phone, email, password, selfieUrl, referredByCode } = req.body;
    firstName = firstName?.trim();
    const cleanPhone = phone ? normalizePhone(phone) : null;
    const cleanEmail = email ? normalizeEmail(email) : null;

    if (!firstName || (!cleanPhone && !cleanEmail)) {
      return res.status(400).json({ error: "Prénom et (e-mail ou téléphone) requis" });
    }
    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: "Adresse e-mail invalide." });
    }
    if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` });
    }

    const id = genId();
    const myReferralCode = `PRO-${genId().toUpperCase()}`;
    try {
      if (cleanPhone) {
        const [existingPhone] = await query(`SELECT id FROM users WHERE phone = $1`, [cleanPhone]);
        if (existingPhone) return res.status(400).json({ error: "Ce numéro de téléphone est déjà utilisé." });
      }
      if (cleanEmail) {
        const [existingEmail] = await query(`SELECT id FROM users WHERE email = $1`, [cleanEmail]);
        if (existingEmail) return res.status(400).json({ error: "Cette adresse e-mail est déjà utilisée." });
      }

      const passwordHash = bcrypt.hashSync(String(password), 10);

      let validatedReferredBy: string | null = null;
      if (referredByCode) {
        const refCode = String(referredByCode).trim().toUpperCase();
        const [referrer] = await query(`SELECT id, first_name FROM users WHERE referral_code ILIKE $1`, [refCode]);
        if (referrer) {
          validatedReferredBy = referrer.id;
          const [ref] = await query(`SELECT balance FROM users WHERE id = $1`, [referrer.id]);
          await query(`UPDATE users SET balance = $1 WHERE id = $2`, [(ref?.balance || 0) + 500, referrer.id]);
        }
      }

      await query(
        `INSERT INTO users (id, first_name, phone, email, password_hash, selfie_url, referral_code, role, referred_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, firstName, cleanPhone, cleanEmail, passwordHash, selfieUrl || null, myReferralCode, 'user', validatedReferredBy]
      );

      const [user] = await query(`SELECT * FROM users WHERE id = $1`, [id]);
      const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, phone: user.phone, user: toPublicUser(user) });
    } catch (error: any) {
      res.status(500).json({ error: "Une erreur est survenue lors de l'enregistrement." });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { identifier, phone, email, password } = req.body;
    const rawIdentifier = String(identifier || email || phone || '').trim();
    if (!rawIdentifier || !password) {
      return res.status(400).json({ error: "Identifiant (e-mail ou téléphone) et mot de passe requis." });
    }

    const genericError = { error: "Identifiants incorrects." };
    try {
      const rows = isEmailLike(rawIdentifier)
        ? await query(`SELECT * FROM users WHERE email = $1`, [normalizeEmail(rawIdentifier)])
        : await query(`SELECT * FROM users WHERE phone = $1`, [normalizePhone(rawIdentifier)]);
      const user = rows[0];

      if (!user || !user.password_hash) return res.status(401).json(genericError);
      if (user.is_banned) {
        return res.status(403).json({ error: "Votre compte a été banni. Veuillez contacter l'administration." });
      }
      const isMatch = bcrypt.compareSync(String(password), user.password_hash);
      if (!isMatch) return res.status(401).json(genericError);

      const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, phone: user.phone, user: toPublicUser(user) });
    } catch (e: any) {
      res.status(500).json({ error: "Erreur serveur lors de la connexion." });
    }
  });

  app.get("/api/users/me", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const [user] = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
      res.json(toPublicUser(user));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/global/stats", async (_req, res) => {
    try {
      const [row] = await query(`SELECT rpc_platform_stats() AS stats`);
      res.json(row.stats);
    } catch (err: any) {
      res.status(500).json({ error: "Erreur lors du calcul des statistiques globales: " + err.message });
    }
  });

  // --- Parrainage ---

  app.get("/api/referrals", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const [user] = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

      const referrals = await query(
        `SELECT id, first_name, phone, balance, role FROM users
         WHERE referred_by = $1 OR referred_by = $2 ORDER BY id DESC`,
        [userId, user.referral_code]
      );

      const enriched = await Promise.all(referrals.map(async (r: any) => {
        const [{ count }] = await query(`SELECT COUNT(*)::int AS count FROM group_members WHERE user_id = $1`, [r.id]);
        return { ...r, groupCount: count || 0 };
      }));

      const totalEarned = enriched.reduce((sum, r) => sum + 500 + (r.groupCount > 0 ? 1500 : 0), 0);

      res.json({
        referralCode: user.referral_code,
        totalEarned,
        referrals: enriched.map(r => ({
          id: r.id,
          firstName: r.first_name,
          phone: r.phone,
          status: r.groupCount > 0 ? 'actif' : 'inscrit',
          date: new Date().toLocaleDateString('fr-FR'),
          bonus: 500 + (r.groupCount > 0 ? 1500 : 0)
        }))
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- Groupes ---

  app.get("/api/groups", async (_req, res) => {
    const groups = await query(`SELECT * FROM groups WHERE status = ANY($1::text[])`, [['open', 'active']]);
    res.json(camelizeKeys(groups));
  });

  app.get("/api/groups/:id", async (req, res) => {
    const [group] = await query(`SELECT * FROM groups WHERE id = $1`, [req.params.id]);
    if (!group) return res.status(404).json({ error: "Groupe introuvable" });
    const memberRows = await query(
      `SELECT gm.*, u.first_name AS user_first_name, u.phone AS user_phone, u.selfie_url AS user_selfie_url
       FROM group_members gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1`,
      [req.params.id]
    );
    const members = memberRows.map((m: any) => camelizeKeys({
      id: m.id, group_id: m.group_id, user_id: m.user_id, positions: m.positions,
      payout_order: m.payout_order, joined_at: m.joined_at,
      firstName: m.user_first_name, phone: m.user_phone, selfieUrl: m.user_selfie_url
    }));
    res.json({ ...camelizeKeys(group), members });
  });

  app.post("/api/groups/join", async (req, res) => {
    const { groupId, positions } = req.body;
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé. Jeton requis." });

    const [group] = await query(`SELECT * FROM groups WHERE id = $1`, [groupId]);
    if (!group || group.status !== 'open') {
      return res.status(400).json({ error: "Ce groupe n'est plus ouvert." });
    }
    if (group.current_members_count + positions > group.max_members) {
      return res.status(400).json({ error: "Pas assez de places disponibles." });
    }

    const totalCost = Math.round(group.stake * 1.1 * positions);
    const [userData] = await query(`SELECT balance FROM users WHERE id = $1`, [userId]);
    if (!userData || (userData.balance || 0) < totalCost) {
      return res.status(400).json({ error: "Solde insuffisant. Rechargez votre compte.", code: "INSUFFICIENT_BALANCE" });
    }

    const joinedAt = new Date().toISOString();
    try {
      await query(`SELECT rpc_join_group($1, $2, $3, $4, $5, $6)`, [
        genId(), groupId, userId, positions, joinedAt, `pay_group_${genId()}`
      ]);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }

    const newBalance = (userData.balance || 0) - totalCost;
    await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);
    await query(
      `INSERT INTO wallet_transactions (id, user_id, type, amount, description, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [`txn_${genId()}`, userId, 'group_join', -totalCost,
        `Adhésion tontine: ${group.name} (${positions} bras)`, 'completed', joinedAt]
    );

    // Bonus parrain actif : +1 500 FCFA au parrain lors du 1er groupe rejoint par le filleul
    const [joiningUser] = await query(`SELECT referred_by FROM users WHERE id = $1`, [userId]);
    if (joiningUser?.referred_by) {
      const [{ count }] = await query(`SELECT COUNT(*)::int AS count FROM group_members WHERE user_id = $1`, [userId]);
      if (count === 1) {
        const [referrer] = await query(`SELECT balance FROM users WHERE id = $1`, [joiningUser.referred_by]);
        if (referrer) {
          await query(`UPDATE users SET balance = $1 WHERE id = $2`, [(referrer.balance || 0) + 1500, joiningUser.referred_by]);
        }
      }
    }

    res.json({ success: true, newBalance });
  });

  app.post("/api/groups/:id/pay-period", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    const groupId = req.params.id;
    try {
      const [group] = await query(`SELECT * FROM groups WHERE id = $1`, [groupId]);
      if (!group || group.status === 'completed' || group.status === 'deleted') return res.status(400).json({ error: "Ce groupe est terminé ou clôturé." });

      const [membership] = await query(
        `SELECT positions FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [groupId, userId]
      );
      if (!membership) return res.status(404).json({ error: "Vous n'êtes pas membre de ce groupe." });

      const amount = group.stake * (membership.positions || 1);
      const commission = Math.round(amount * 0.1);

      const [userData] = await query(`SELECT balance FROM users WHERE id = $1`, [userId]);
      if (!userData || (userData.balance || 0) < amount) {
        return res.status(400).json({ error: "Solde insuffisant. Rechargez votre compte.", code: "INSUFFICIENT_BALANCE" });
      }

      const now = new Date().toISOString();
      const newBalance = (userData.balance || 0) - amount;
      await query(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);
      await query(
        `INSERT INTO payments (id, group_id, user_id, amount, commission, status, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [`pay_period_${genId()}`, groupId, userId, amount, commission, 'completed', now]
      );
      await query(
        `INSERT INTO wallet_transactions (id, user_id, type, amount, description, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [`txn_${genId()}`, userId, 'group_payment', -amount, `Cotisation tontine: ${group.name}`, 'completed', now]
      );

      res.json({ success: true, newBalance, amount });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/users/:userId/groups", async (req, res) => {
    const authUserId = getUserIdFromRequest(req);
    if (!authUserId) return res.status(401).json({ error: "Non autorisé. Connexion requise." });

    let userId = req.params.userId === 'me' ? authUserId : req.params.userId;
    if (userId !== authUserId) {
      const [requester] = await query(`SELECT role FROM users WHERE id = $1`, [authUserId]);
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé." });
      }
    }

    const memberships = await query(
      `SELECT gm.positions, gm.joined_at, g.*
       FROM group_members gm JOIN groups g ON g.id = gm.group_id
       WHERE gm.user_id = $1`,
      [userId]
    );
    res.json(memberships.map((m: any) => camelizeKeys(m)));
  });

  // --- Support ---

  app.get("/api/messages/:userId", async (req, res) => {
    const authUserId = getUserIdFromRequest(req);
    if (!authUserId) return res.status(401).json({ error: "Non autorisé. Connexion requise." });

    let userId = req.params.userId === 'me' ? authUserId : req.params.userId;
    if (userId !== authUserId) {
      const [requester] = await query(`SELECT role FROM users WHERE id = $1`, [authUserId]);
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé." });
      }
    }

    const messages = await query(`SELECT * FROM messages WHERE user_id = $1 ORDER BY timestamp`, [userId]);
    res.json(camelizeKeys(messages));
  });

  app.post("/api/messages", async (req, res) => {
    const headerUserId = getUserIdFromRequest(req);
    if (!headerUserId) return res.status(401).json({ error: "Non autorisé. Connexion requise." });

    const { userId, type, content, isAdmin } = req.body;
    const [requester] = await query(`SELECT role FROM users WHERE id = $1`, [headerUserId]);
    const isRequesterAdmin = requester?.role === 'admin';

    const finalUserId = isRequesterAdmin ? (userId || headerUserId) : headerUserId;
    const finalIsAdmin = isRequesterAdmin ? !!isAdmin : false;

    const id = genId();
    const timestamp = new Date().toISOString();
    try {
      await query(
        `INSERT INTO messages (id, user_id, type, content, is_admin, timestamp) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, finalUserId, type, content, finalIsAdmin, timestamp]
      );
      res.json({ id, userId: finalUserId, type, content, isAdmin: finalIsAdmin, timestamp });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- Admin ---

  app.use("/api/admin", adminMiddleware as any);

  app.get("/api/admin/stats", async (_req, res) => {
    try {
      const [statsRow] = await query(`SELECT rpc_platform_stats() AS stats`);
      const [historyRow] = await query(`SELECT rpc_commissions_history() AS history`);
      res.json({ ...statsRow.stats, commissionsHistory: historyRow.history || [] });
    } catch (error: any) {
      res.status(500).json({ error: "Erreur serveur statistiques: " + error.message });
    }
  });

  app.post("/api/admin/groups", async (req, res) => {
    const { name, stake, maxMembers, durationDays } = req.body;
    const id = genId();
    try {
      await query(
        `INSERT INTO groups (id, name, stake, max_members, duration_days, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, name, stake, maxMembers || 10, durationDays || 30, new Date().toISOString()]
      );
      res.json({ id, name, stake, maxMembers, durationDays, status: 'open' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/groups/:id", async (req, res) => {
    try {
      await query(`UPDATE groups SET status = 'deleted' WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/users/:userId/ban", async (req, res) => {
    const { isBanned } = req.body;
    try {
      await query(`UPDATE users SET is_banned = $1 WHERE id = $2`, [!!isBanned, req.params.userId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/users/:userId/history", async (req, res) => {
    const rows = await query(
      `SELECT p.*, g.name AS group_name FROM payments p JOIN groups g ON g.id = p.group_id
       WHERE p.user_id = $1 ORDER BY p.timestamp DESC`,
      [req.params.userId]
    );
    const payments = rows.map((p: any) => camelizeKeys({
      id: p.id, group_id: p.group_id, user_id: p.user_id, amount: p.amount, commission: p.commission,
      status: p.status, timestamp: p.timestamp, groupName: p.group_name
    }));
    res.json(payments);
  });

  app.get("/api/admin/users", async (_req, res) => {
    const users = await query(`SELECT * FROM users ORDER BY first_name`);
    res.json(users.map(toPublicUser));
  });

  app.get("/api/admin/tontines", async (_req, res) => {
    try {
      const groups = await query(`SELECT * FROM groups WHERE status != 'deleted' ORDER BY created_at DESC`);

      const result = await Promise.all(groups.map(async (g: any) => {
        const memberRows = await query(
          `SELECT gm.*, u.first_name AS user_first_name, u.phone AS user_phone, u.selfie_url AS user_selfie_url
           FROM group_members gm JOIN users u ON u.id = gm.user_id
           WHERE gm.group_id = $1 ORDER BY gm.joined_at`,
          [g.id]
        );
        const paymentRows = await query(
          `SELECT p.*, u.first_name AS user_first_name, u.phone AS user_phone
           FROM payments p JOIN users u ON u.id = p.user_id
           WHERE p.group_id = $1 ORDER BY p.timestamp`,
          [g.id]
        );

        const members = memberRows.map((m: any) => camelizeKeys({
          id: m.id, group_id: m.group_id, user_id: m.user_id, positions: m.positions,
          payout_order: m.payout_order, joined_at: m.joined_at,
          firstName: m.user_first_name, phone: m.user_phone, selfieUrl: m.user_selfie_url
        }));
        const payments = paymentRows.map((p: any) => camelizeKeys({
          id: p.id, group_id: p.group_id, user_id: p.user_id, amount: p.amount, commission: p.commission,
          status: p.status, timestamp: p.timestamp,
          firstName: p.user_first_name, phone: p.user_phone
        }));
        return { ...camelizeKeys(g), members, payments };
      }));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/groups/:id/members", async (req, res) => {
    const groupId = req.params.id;
    const { userId, positions } = req.body;
    if (!userId) return res.status(400).json({ error: "L'identifiant du membre (userId) est requis." });
    const numPositions = parseInt(String(positions)) || 1;

    const [group] = await query(`SELECT * FROM groups WHERE id = $1`, [groupId]);
    if (!group || group.status === 'deleted') return res.status(404).json({ error: "Groupe introuvable." });

    const [user] = await query(`SELECT id FROM users WHERE id = $1`, [userId]);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    if (group.current_members_count + numPositions > group.max_members) {
      return res.status(400).json({ error: "Nombre de bras maximum dépassé." });
    }

    const joinedAt = new Date().toISOString();
    try {
      await query(`SELECT rpc_join_group($1, $2, $3, $4, $5, $6)`, [
        `gm_${genId()}`, groupId, userId, numPositions, joinedAt, `pay_group_${genId()}`
      ]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/groups/:id/members/:memberId", async (req, res) => {
    try {
      await query(`SELECT rpc_remove_member($1, $2)`, [req.params.memberId, req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/groups/:id/status", async (req, res) => {
    const { status } = req.body;
    try {
      await query(`UPDATE groups SET status = $1 WHERE id = $2`, [status, req.params.id]);
      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/messages", async (_req, res) => {
    const rows = await query(
      `SELECT m.*, u.first_name AS user_first_name FROM messages m JOIN users u ON u.id = m.user_id
       ORDER BY m.timestamp DESC LIMIT 100`
    );
    const messages = rows.map((m: any) => camelizeKeys({
      id: m.id, user_id: m.user_id, type: m.type, content: m.content, is_admin: m.is_admin, timestamp: m.timestamp,
      userName: m.user_first_name
    }));
    res.json(messages);
  });

  // --- Admin Cartes ---

  app.get("/api/admin/cards", async (_req, res) => {
    try {
      const cards = await query(
        `SELECT mc.*, u.first_name AS user_first_name, u.phone AS user_phone, u.selfie_url AS user_selfie_url
         FROM my_cards mc JOIN users u ON u.id = mc.user_id
         ORDER BY mc.created_at DESC`
      );
      const result = await Promise.all(cards.map(async (card: any) => {
        const payments = await query(`SELECT * FROM card_payments WHERE card_id = $1 ORDER BY day_index`, [card.id]);
        return camelizeKeys({
          id: card.id, user_id: card.user_id, title: card.title, daily_amount: card.daily_amount,
          total_days: card.total_days, status: card.status, created_at: card.created_at,
          userFirstName: card.user_first_name, userPhone: card.user_phone, userSelfie: card.user_selfie_url,
          payments
        });
      }));
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/cards", async (req, res) => {
    const { userId, title, dailyAmount, totalDays } = req.body;
    if (!userId) return res.status(400).json({ error: "L'identifiant de membre (userId) est requis" });
    const [userExists] = await query(`SELECT id FROM users WHERE id = $1`, [userId]);
    if (!userExists) return res.status(404).json({ error: "Membre non trouvé" });

    const cardId = `card_${genId()}`;
    const sanitizedTitle = (title || "Ma Tontine Journalière").trim();
    const sanitizedAmount = parseInt(String(dailyAmount)) || 5000;
    const sanitizedDays = parseInt(String(totalDays)) || 31;
    try {
      await query(
        `INSERT INTO my_cards (id, user_id, title, daily_amount, total_days) VALUES ($1, $2, $3, $4, $5)`,
        [cardId, userId, sanitizedTitle, sanitizedAmount, sanitizedDays]
      );
      res.json({ id: cardId, userId, title: sanitizedTitle, dailyAmount: sanitizedAmount, totalDays: sanitizedDays, payments: [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/cards/:id", async (req, res) => {
    try {
      await query(`DELETE FROM card_payments WHERE card_id = $1`, [req.params.id]);
      await query(`DELETE FROM my_cards WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Admin Parrainages ---

  app.get("/api/admin/referrals", async (_req, res) => {
    try {
      const children = await query(
        `SELECT id, first_name, phone, selfie_url, referred_by FROM users WHERE referred_by IS NOT NULL ORDER BY id DESC`
      );

      const relations = await Promise.all(children.map(async (child: any) => {
        const [parent] = await query(
          `SELECT id, first_name, phone FROM users WHERE id = $1 OR referral_code = $1`,
          [child.referred_by]
        );
        const [{ count }] = await query(`SELECT COUNT(*)::int AS count FROM group_members WHERE user_id = $1`, [child.id]);
        return {
          childId: child.id, childName: child.first_name, childPhone: child.phone,
          childSelfie: child.selfie_url, childGroupCount: count || 0,
          parentId: parent?.id, parentName: parent?.first_name, parentPhone: parent?.phone
        };
      }));

      const referrerMap = new Map<string, any>();
      for (const r of relations) {
        if (!r.parentId) continue;
        const key = r.parentId;
        if (!referrerMap.has(key)) {
          referrerMap.set(key, { id: r.parentId, firstName: r.parentName, phone: r.parentPhone, referralCount: 0, rewardsEarned: 0 });
        }
        const entry = referrerMap.get(key);
        entry.referralCount++;
        entry.rewardsEarned += r.childGroupCount > 0 ? 2000 : 500;
      }
      const topReferrers = [...referrerMap.values()].sort((a, b) => b.referralCount - a.referralCount);

      res.json({ relations, topReferrers });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- Admin Paramètres & Logs ---

  app.get("/api/admin/settings", async (_req, res) => {
    try {
      const rows = await query(`SELECT * FROM system_settings`);
      const settingsMap: Record<string, string> = {};
      for (const row of rows) settingsMap[row.key] = row.value;
      res.json(settingsMap);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/settings", async (req: any, res) => {
    try {
      const updates = req.body;
      const upsertData = Object.entries(updates).map(([key, val]) => ({
        key, value: typeof val === 'object' ? JSON.stringify(val) : String(val)
      }));
      for (const { key, value } of upsertData) {
        await query(
          `INSERT INTO system_settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, value]
        );
      }

      for (const { key, value } of upsertData) {
        await query(
          `INSERT INTO system_logs (id, action, details, timestamp) VALUES ($1, $2, $3, $4)`,
          [`log_${genId()}`, `Modification: ${key}`,
            `Par ${req.adminUser.firstName}. Nouvelle valeur: ${value.substring(0, 150)}`, new Date().toISOString()]
        );
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/admin/logs", async (_req, res) => {
    const logs = await query(`SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 100`);
    res.json(camelizeKeys(logs));
  });

  app.get("/api/admin/administrators", async (_req, res) => {
    const admins = await query(`SELECT id, first_name, phone, role FROM users WHERE role = 'admin'`);
    res.json(camelizeKeys(admins));
  });

  app.post("/api/admin/administrators/promote", async (req: any, res) => {
    const { phone, firstName, password } = req.body;
    const cleanPhone = normalizePhone(phone || '');
    if (!cleanPhone) return res.status(400).json({ error: "Numéro de téléphone requis" });

    try {
      const [user] = await query(`SELECT * FROM users WHERE phone = $1`, [cleanPhone]);
      if (user) {
        await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [user.id]);
        await query(
          `INSERT INTO system_logs (id, action, details, timestamp) VALUES ($1, $2, $3, $4)`,
          [`log_${genId()}`, "Promotion Administrateur",
            `${req.adminUser.firstName} a promu ${user.first_name} (${cleanPhone}) au rôle admin`, new Date().toISOString()]
        );
      } else {
        if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
          return res.status(400).json({ error: `Un mot de passe d'au moins ${MIN_PASSWORD_LENGTH} caractères est requis pour créer un nouvel administrateur.` });
        }
        const id = `admin_${genId()}`;
        const referralCode = `PRO-${genId().toUpperCase()}`;
        const name = firstName || "Admin Associé";
        await query(
          `INSERT INTO users (id, first_name, phone, password_hash, referral_code, role) VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, name, cleanPhone, bcrypt.hashSync(String(password), 10), referralCode, 'admin']
        );
        await query(
          `INSERT INTO system_logs (id, action, details, timestamp) VALUES ($1, $2, $3, $4)`,
          [`log_${genId()}`, "Création Administrateur",
            `${req.adminUser.firstName} a créé l'administrateur ${name} (${cleanPhone})`, new Date().toISOString()]
        );
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- Vite / Fichiers statiques ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Échec du démarrage du serveur:", err);
  process.exit(1);
});
