import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { supabase, camelizeKeys } from "./lib/supabase";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "tontine-pro-secret-key-123456";
if (JWT_SECRET === "tontine-pro-secret-key-123456") {
  console.warn("⚠️  Avertissement de Sécurité: Configurez JWT_SECRET dans votre .env");
}

const genId = () => Math.random().toString(36).substr(2, 9);
const normalizePhone = (phone: string) => phone.replace(/[\s\(\)\-\.]/g, '');

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
    const { data: adminUser } = await supabase
      .from('users').select('role, first_name').eq('id', adminId).single();
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
  const { data: settingsCount } = await supabase
    .from('system_settings').select('key', { count: 'exact', head: true });

  const { count } = await supabase.from('system_settings').select('*', { count: 'exact', head: true });
  if (!count || count === 0) {
    console.log("Initialisation des paramètres système...");
    await supabase.from('system_settings').upsert([
      { key: 'commission_rate', value: '10' },
      { key: 'withdrawal_limit', value: '500000' },
      { key: 'min_deposit', value: '500' },
      { key: 'max_deposit', value: '1000000' },
      { key: 'formulas_config', value: JSON.stringify([
        { id: 'tontine_classique', name: 'Tontine Classique', stake: 1000, durationDays: 10, maxMembers: 10 },
        { id: 'tontine_argent', name: 'Tontine Argent', stake: 5000, durationDays: 30, maxMembers: 10 },
        { id: 'tontine_or', name: 'Tontine Or', stake: 10000, durationDays: 30, maxMembers: 10 }
      ])}
    ], { onConflict: 'key' });

    await supabase.from('system_logs').insert({
      id: `log_${genId()}`, action: "Initialisation système",
      details: "Paramètres par défaut initialisés avec succès",
      timestamp: new Date().toISOString()
    });
  }

  // Admin par défaut
  const adminPhone = normalizePhone(process.env.ADMIN_PHONE || "0000");
  const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";
  const { data: adminExists } = await supabase
    .from('users').select('id').or(`role.eq.admin,phone.eq.${adminPhone}`).maybeSingle();

  if (!adminExists) {
    console.log(`Création de l'admin (Phone: ${adminPhone})...`);
    const hash = bcrypt.hashSync(adminPassword, 10);
    await supabase.from('users').insert({
      id: 'admin-001', first_name: 'Admin', phone: adminPhone,
      password: adminPassword, password_hash: hash,
      referral_code: 'PRO-ADMIN', role: 'admin'
    });
  }

  // Utilisateur test
  const { data: testExists } = await supabase
    .from('users').select('id').eq('phone', '+22501010101').maybeSingle();
  if (!testExists) {
    await supabase.from('users').insert({
      id: 'test-001', first_name: 'Koffi', phone: '+22501010101',
      referral_code: 'PRO-KOFFI', role: 'user'
    });
  }

  // Groupes par défaut
  const { count: groupsCount } = await supabase
    .from('groups').select('*', { count: 'exact', head: true }).neq('status', 'deleted');
  if (!groupsCount || groupsCount === 0) {
    console.log("Création des groupes par défaut...");
    await supabase.from('groups').insert([
      { id: 'group-alimentaire-01', name: 'Tontine Alimentaire Sereine', stake: 5000, max_members: 15, duration_days: 180, created_at: new Date().toISOString() },
      { id: 'group-cash-01', name: 'Tontine Cash Rapide', stake: 1000, max_members: 10, duration_days: 30, created_at: new Date().toISOString() },
      { id: 'group-babymama-01', name: 'Tontine Baby Mama Douceur', stake: 5000, max_members: 12, duration_days: 90, created_at: new Date().toISOString() },
      { id: 'group-school-01', name: 'Tontine School Rentrée Sûre', stake: 5000, max_members: 20, duration_days: 180, created_at: new Date().toISOString() }
    ]);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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
      const { data: cards, error } = await supabase
        .from('my_cards').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      const result = await Promise.all((cards || []).map(async (card) => {
        const { data: payments } = await supabase
          .from('card_payments').select('*').eq('card_id', card.id).order('day_index');
        return camelizeKeys({ ...card, payments: payments || [] });
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
      const { error } = await supabase.from('my_cards').insert({
        id: cardId, user_id: userId, title: sanitizedTitle,
        daily_amount: sanitizedAmount, total_days: sanitizedDays
      });
      if (error) throw error;
      res.json({ id: cardId, userId, title: sanitizedTitle, dailyAmount: sanitizedAmount, totalDays: sanitizedDays, payments: [] });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/my-cards/:id/pay", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    const cardId = req.params.id;
    const { dayIndex } = req.body;
    try {
      const { data: card } = await supabase.from('my_cards').select('*').eq('id', cardId).single();
      if (!card || card.user_id !== userId) return res.status(404).json({ error: "Carte non trouvée" });

      const { data: userData } = await supabase.from('users').select('balance').eq('id', userId).single();
      if (!userData || (userData.balance || 0) < card.daily_amount) {
        return res.status(400).json({ error: "Solde insuffisant. Rechargez votre compte.", code: "INSUFFICIENT_BALANCE" });
      }

      const isCommission = dayIndex === (card.total_days - 1);
      const paymentId = `pay_${genId()}`;
      const { error } = await supabase.from('card_payments').insert({
        id: paymentId, card_id: cardId, day_index: dayIndex,
        amount: card.daily_amount, is_commission: isCommission
      });
      if (error) throw error;

      const newBalance = (userData.balance || 0) - card.daily_amount;
      await supabase.from('users').update({ balance: newBalance }).eq('id', userId);
      await supabase.from('wallet_transactions').insert({
        id: `txn_${genId()}`, user_id: userId, type: 'card_payment',
        amount: -card.daily_amount,
        description: `Cotisation carte — Jour ${dayIndex + 1}${isCommission ? ' (frais de gestion)' : ''}`,
        status: 'completed', created_at: new Date().toISOString()
      });

      if (isCommission) {
        await supabase.from('my_cards').update({ status: 'completed' }).eq('id', cardId);
      }
      res.json({ success: true, isCommission, newBalance });
    } catch (e: any) { res.status(500).json({ error: "Paiement déjà effectué ou erreur serveur" }); }
  });

  app.delete("/api/my-cards/:id", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    const cardId = req.params.id;
    try {
      const { data: card } = await supabase.from('my_cards').select('*').eq('id', cardId).single();
      if (!card || card.user_id !== userId) return res.status(404).json({ error: "Carte non trouvée" });
      await supabase.from('card_payments').delete().eq('card_id', cardId);
      await supabase.from('my_cards').delete().eq('id', cardId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- Wallet ---

  app.get("/api/wallet", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
      const { data: transactions } = await supabase
        .from('wallet_transactions').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(30);
      res.json({ balance: user?.balance || 0, transactions: (transactions || []).map(camelizeKeys) });
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
      const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
      const newBalance = (user.balance || 0) + amount;
      await supabase.from('users').update({ balance: newBalance }).eq('id', userId);
      await supabase.from('wallet_transactions').insert({
        id: `txn_${genId()}`, user_id: userId, type: 'recharge',
        amount, description: `Recharge via Mobile Money${phone ? ` (${phone})` : ''}`,
        status: 'completed', created_at: new Date().toISOString()
      });
      res.json({ success: true, newBalance, amount });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // --- Auth / Utilisateurs ---

  app.post("/api/register", async (req, res) => {
    let { firstName, phone, password, selfieUrl, referredByCode } = req.body;
    firstName = firstName?.trim();
    const cleanPhone = normalizePhone(phone || '');
    if (!firstName || !cleanPhone) {
      return res.status(400).json({ error: "Prénom et téléphone requis" });
    }
    const id = genId();
    const myReferralCode = `PRO-${genId().toUpperCase()}`;
    try {
      const { data: existing } = await supabase.from('users').select('id').eq('phone', cleanPhone).maybeSingle();
      if (existing) return res.status(400).json({ error: "Ce numéro de téléphone est déjà utilisé." });

      const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

      let validatedReferredBy = null;
      if (referredByCode) {
        const refCode = String(referredByCode).trim().toUpperCase();
        const { data: referrer } = await supabase
          .from('users').select('id, first_name').ilike('referral_code', refCode).maybeSingle();
        if (referrer) {
          validatedReferredBy = referrer.id;
          const { data: ref } = await supabase.from('users').select('balance').eq('id', referrer.id).single();
          await supabase.from('users').update({ balance: (ref?.balance || 0) + 500 }).eq('id', referrer.id);
        }
      }

      const { error } = await supabase.from('users').insert({
        id, first_name: firstName, phone: cleanPhone,
        password: password || null, password_hash: passwordHash,
        selfie_url: selfieUrl, referral_code: myReferralCode,
        role: 'user', referred_by: validatedReferredBy
      });
      if (error) throw error;

      const { data: user } = await supabase.from('users').select('*').eq('id', id).single();
      const token = jwt.sign({ id: user!.id, phone: user!.phone, role: user!.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, phone: user!.phone, user: camelizeKeys(user) });
    } catch (error: any) {
      res.status(500).json({ error: "Une erreur est survenue lors de l'enregistrement." });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { phone, password } = req.body;
    const cleanPhone = normalizePhone(phone || '');
    console.log(`Login attempt for phone: [${cleanPhone}]`);
    let { data: user } = await supabase.from('users').select('*').eq('phone', cleanPhone).maybeSingle();

    if (!user) {
      console.log(`Utilisateur [${cleanPhone}] non trouvé. Auto-inscription sandbox...`);
      const id = genId();
      const referralCode = `PRO-${genId().toUpperCase()}`;
      const name = "Épargnant " + (cleanPhone.length >= 4 ? cleanPhone.slice(-4) : cleanPhone);
      const passwordHash = password ? bcrypt.hashSync(password, 10) : null;
      const { error } = await supabase.from('users').insert({
        id, first_name: name, phone: cleanPhone,
        password: password || null, password_hash: passwordHash,
        referral_code: referralCode, role: 'user', balance: 100000
      });
      if (!error) {
        const { data: newUser } = await supabase.from('users').select('*').eq('id', id).single();
        user = newUser;
      }
    }

    if (user) {
      if (user.is_banned) {
        return res.status(403).json({ error: "Votre compte a été banni. Veuillez contacter l'administration." });
      }
      if (password) {
        let isMatch = false;
        if (user.password_hash) isMatch = bcrypt.compareSync(password, user.password_hash);
        else if (user.password) isMatch = (user.password === password);
        else isMatch = true;
        if (!isMatch) return res.status(400).json({ error: "Mot de passe incorrect" });
      }
      const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, phone: user.phone, user: camelizeKeys(user) });
    } else {
      res.status(404).json({ error: "Utilisateur non trouvé" });
    }
  });

  app.get("/api/users/me", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
      res.json(camelizeKeys(user));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/global/stats", async (_req, res) => {
    try {
      const { data: stats, error } = await supabase.rpc('rpc_platform_stats');
      if (error) throw error;
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: "Erreur lors du calcul des statistiques globales: " + err.message });
    }
  });

  // --- Parrainage ---

  app.get("/api/referrals", async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé" });
    try {
      const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

      const { data: referrals } = await supabase
        .from('users').select('id, first_name, phone, balance, role')
        .or(`referred_by.eq.${userId},referred_by.eq.${user.referral_code}`)
        .order('id', { ascending: false });

      const enriched = await Promise.all((referrals || []).map(async (r: any) => {
        const { count } = await supabase
          .from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', r.id);
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
    const { data: groups } = await supabase
      .from('groups').select('*').in('status', ['open', 'active']);
    res.json(camelizeKeys(groups || []));
  });

  app.get("/api/groups/:id", async (req, res) => {
    const { data: group } = await supabase.from('groups').select('*').eq('id', req.params.id).single();
    if (!group) return res.status(404).json({ error: "Groupe introuvable" });
    const { data: memberRows } = await supabase
      .from('group_members').select('*, users(first_name, phone, selfie_url)').eq('group_id', req.params.id);
    const members = (memberRows || []).map((m: any) => camelizeKeys({
      ...m, firstName: m.users?.first_name, phone: m.users?.phone,
      selfieUrl: m.users?.selfie_url, users: undefined
    }));
    res.json({ ...camelizeKeys(group), members });
  });

  app.post("/api/groups/join", async (req, res) => {
    const { groupId, positions } = req.body;
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Non autorisé. Jeton requis." });

    const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single();
    if (!group || group.status !== 'open') {
      return res.status(400).json({ error: "Ce groupe n'est plus ouvert." });
    }
    if (group.current_members_count + positions > group.max_members) {
      return res.status(400).json({ error: "Pas assez de places disponibles." });
    }

    const joinedAt = new Date().toISOString();
    const { error } = await supabase.rpc('rpc_join_group', {
      p_member_id: genId(), p_group_id: groupId, p_user_id: userId,
      p_positions: positions, p_joined_at: joinedAt, p_payment_id: `pay_group_${genId()}`
    });
    if (error) return res.status(400).json({ error: error.message });

    // Bonus parrain actif : +1 500 FCFA au parrain lors du 1er groupe rejoint par le filleul
    const { data: joiningUser } = await supabase.from('users').select('referred_by').eq('id', userId).single();
    if (joiningUser?.referred_by) {
      const { count } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      if (count === 1) {
        const { data: referrer } = await supabase.from('users').select('balance').eq('id', joiningUser.referred_by).single();
        if (referrer) {
          await supabase.from('users').update({ balance: (referrer.balance || 0) + 1500 }).eq('id', joiningUser.referred_by);
        }
      }
    }

    res.json({ success: true });
  });

  app.get("/api/users/:userId/groups", async (req, res) => {
    const authUserId = getUserIdFromRequest(req);
    if (!authUserId) return res.status(401).json({ error: "Non autorisé. Connexion requise." });

    let userId = req.params.userId === 'me' ? authUserId : req.params.userId;
    if (userId !== authUserId) {
      const { data: requester } = await supabase.from('users').select('role').eq('id', authUserId).single();
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé." });
      }
    }

    const { data: memberships } = await supabase
      .from('group_members').select('positions, joined_at, groups(*)').eq('user_id', userId);
    const groups = (memberships || []).map((m: any) => camelizeKeys({
      ...m.groups, positions: m.positions, joinedAt: m.joined_at
    }));
    res.json(groups);
  });

  // --- Support ---

  app.get("/api/messages/:userId", async (req, res) => {
    const authUserId = getUserIdFromRequest(req);
    if (!authUserId) return res.status(401).json({ error: "Non autorisé. Connexion requise." });

    let userId = req.params.userId === 'me' ? authUserId : req.params.userId;
    if (userId !== authUserId) {
      const { data: requester } = await supabase.from('users').select('role').eq('id', authUserId).single();
      if (!requester || requester.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé." });
      }
    }

    const { data: messages } = await supabase
      .from('messages').select('*').eq('user_id', userId).order('timestamp');
    res.json(camelizeKeys(messages || []));
  });

  app.post("/api/messages", async (req, res) => {
    const headerUserId = getUserIdFromRequest(req);
    if (!headerUserId) return res.status(401).json({ error: "Non autorisé. Connexion requise." });

    const { userId, type, content, isAdmin } = req.body;
    const { data: requester } = await supabase.from('users').select('role').eq('id', headerUserId).single();
    const isRequesterAdmin = requester?.role === 'admin';

    const finalUserId = isRequesterAdmin ? (userId || headerUserId) : headerUserId;
    const finalIsAdmin = isRequesterAdmin ? !!isAdmin : false;

    const id = genId();
    const timestamp = new Date().toISOString();
    const { error } = await supabase.from('messages').insert({
      id, user_id: finalUserId, type, content, is_admin: finalIsAdmin, timestamp
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ id, userId: finalUserId, type, content, isAdmin: finalIsAdmin, timestamp });
  });

  // --- Admin ---

  app.use("/api/admin", adminMiddleware as any);
  app.use("/api/admin/*", adminMiddleware as any);

  app.get("/api/admin/stats", async (_req, res) => {
    try {
      const { data: summary, error: statsErr } = await supabase.rpc('rpc_platform_stats');
      if (statsErr) throw statsErr;
      const { data: commissionsHistory, error: comErr } = await supabase.rpc('rpc_commissions_history');
      if (comErr) throw comErr;
      res.json({ ...summary, commissionsHistory: commissionsHistory || [] });
    } catch (error: any) {
      res.status(500).json({ error: "Erreur serveur statistiques: " + error.message });
    }
  });

  app.post("/api/admin/groups", async (req, res) => {
    const { name, stake, maxMembers, durationDays } = req.body;
    const id = genId();
    const { error } = await supabase.from('groups').insert({
      id, name, stake, max_members: maxMembers || 10,
      duration_days: durationDays || 30, created_at: new Date().toISOString()
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ id, name, stake, maxMembers, durationDays, status: 'open' });
  });

  app.delete("/api/admin/groups/:id", async (req, res) => {
    const { error } = await supabase.from('groups').update({ status: 'deleted' }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.post("/api/admin/users/:userId/ban", async (req, res) => {
    const { isBanned } = req.body;
    const { error } = await supabase.from('users').update({ is_banned: !!isBanned }).eq('id', req.params.userId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/admin/users/:userId/history", async (req, res) => {
    const { data: memberRows } = await supabase
      .from('payments').select('*, groups(name)').eq('user_id', req.params.userId).order('timestamp', { ascending: false });
    const payments = (memberRows || []).map((p: any) => camelizeKeys({
      ...p, groupName: p.groups?.name, groups: undefined
    }));
    res.json(payments);
  });

  app.get("/api/admin/users", async (_req, res) => {
    const { data: users } = await supabase.from('users').select('*').order('first_name');
    res.json(camelizeKeys(users || []));
  });

  app.get("/api/admin/tontines", async (_req, res) => {
    try {
      const { data: groups } = await supabase
        .from('groups').select('*').neq('status', 'deleted').order('created_at', { ascending: false });

      const result = await Promise.all((groups || []).map(async (g: any) => {
        const { data: memberRows } = await supabase
          .from('group_members').select('*, users(first_name, phone, selfie_url)').eq('group_id', g.id).order('joined_at');
        const { data: paymentRows } = await supabase
          .from('payments').select('*, users(first_name, phone)').eq('group_id', g.id).order('timestamp');

        const members = (memberRows || []).map((m: any) => camelizeKeys({
          ...m, firstName: m.users?.first_name, phone: m.users?.phone,
          selfieUrl: m.users?.selfie_url, users: undefined
        }));
        const payments = (paymentRows || []).map((p: any) => camelizeKeys({
          ...p, firstName: p.users?.first_name, phone: p.users?.phone, users: undefined
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

    const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single();
    if (!group || group.status === 'deleted') return res.status(404).json({ error: "Groupe introuvable." });

    const { data: user } = await supabase.from('users').select('id').eq('id', userId).single();
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    if (group.current_members_count + numPositions > group.max_members) {
      return res.status(400).json({ error: "Nombre de bras maximum dépassé." });
    }

    const joinedAt = new Date().toISOString();
    const { error } = await supabase.rpc('rpc_join_group', {
      p_member_id: `gm_${genId()}`, p_group_id: groupId, p_user_id: userId,
      p_positions: numPositions, p_joined_at: joinedAt, p_payment_id: `pay_group_${genId()}`
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete("/api/admin/groups/:id/members/:memberId", async (req, res) => {
    const { error } = await supabase.rpc('rpc_remove_member', {
      p_member_id: req.params.memberId, p_group_id: req.params.id
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.post("/api/admin/groups/:id/status", async (req, res) => {
    const { status } = req.body;
    const { error } = await supabase.from('groups').update({ status }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, status });
  });

  app.get("/api/admin/messages", async (_req, res) => {
    const { data: rows } = await supabase
      .from('messages').select('*, users(first_name)').order('timestamp', { ascending: false }).limit(100);
    const messages = (rows || []).map((m: any) => camelizeKeys({
      ...m, userName: m.users?.first_name, users: undefined
    }));
    res.json(messages);
  });

  // --- Admin Cartes ---

  app.get("/api/admin/cards", async (_req, res) => {
    try {
      const { data: cards } = await supabase
        .from('my_cards').select('*, users(first_name, phone, selfie_url)').order('created_at', { ascending: false });
      const result = await Promise.all((cards || []).map(async (card: any) => {
        const { data: payments } = await supabase
          .from('card_payments').select('*').eq('card_id', card.id).order('day_index');
        return camelizeKeys({
          ...card, userFirstName: card.users?.first_name,
          userPhone: card.users?.phone, userSelfie: card.users?.selfie_url,
          users: undefined, payments: payments || []
        });
      }));
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/cards", async (req, res) => {
    const { userId, title, dailyAmount, totalDays } = req.body;
    if (!userId) return res.status(400).json({ error: "L'identifiant de membre (userId) est requis" });
    const { data: userExists } = await supabase.from('users').select('id').eq('id', userId).single();
    if (!userExists) return res.status(404).json({ error: "Membre non trouvé" });

    const cardId = `card_${genId()}`;
    const sanitizedTitle = (title || "Ma Tontine Journalière").trim();
    const sanitizedAmount = parseInt(String(dailyAmount)) || 5000;
    const sanitizedDays = parseInt(String(totalDays)) || 31;
    const { error } = await supabase.from('my_cards').insert({
      id: cardId, user_id: userId, title: sanitizedTitle,
      daily_amount: sanitizedAmount, total_days: sanitizedDays
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: cardId, userId, title: sanitizedTitle, dailyAmount: sanitizedAmount, totalDays: sanitizedDays, payments: [] });
  });

  app.delete("/api/admin/cards/:id", async (req, res) => {
    await supabase.from('card_payments').delete().eq('card_id', req.params.id);
    const { error } = await supabase.from('my_cards').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // --- Admin Parrainages ---

  app.get("/api/admin/referrals", async (_req, res) => {
    try {
      const { data: children } = await supabase
        .from('users').select('id, first_name, phone, selfie_url, referred_by')
        .not('referred_by', 'is', null).order('id', { ascending: false });

      const relations = await Promise.all((children || []).map(async (child: any) => {
        const { data: parent } = await supabase
          .from('users').select('id, first_name, phone')
          .or(`id.eq.${child.referred_by},referral_code.eq.${child.referred_by}`)
          .maybeSingle();
        const { count } = await supabase
          .from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', child.id);
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
      const { data: rows } = await supabase.from('system_settings').select('*');
      const settingsMap: Record<string, string> = {};
      for (const row of rows || []) settingsMap[row.key] = row.value;
      res.json(settingsMap);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/settings", async (req: any, res) => {
    try {
      const updates = req.body;
      const upsertData = Object.entries(updates).map(([key, val]) => ({
        key, value: typeof val === 'object' ? JSON.stringify(val) : String(val)
      }));
      await supabase.from('system_settings').upsert(upsertData, { onConflict: 'key' });

      const logEntries = upsertData.map(({ key, value }) => ({
        id: `log_${genId()}`,
        action: `Modification: ${key}`,
        details: `Par ${req.adminUser.firstName}. Nouvelle valeur: ${value.substring(0, 150)}`,
        timestamp: new Date().toISOString()
      }));
      await supabase.from('system_logs').insert(logEntries);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/admin/logs", async (_req, res) => {
    const { data: logs } = await supabase
      .from('system_logs').select('*').order('timestamp', { ascending: false }).limit(100);
    res.json(camelizeKeys(logs || []));
  });

  app.get("/api/admin/administrators", async (_req, res) => {
    const { data: admins } = await supabase
      .from('users').select('id, first_name, phone, role').eq('role', 'admin');
    res.json(camelizeKeys(admins || []));
  });

  app.post("/api/admin/administrators/promote", async (req: any, res) => {
    const { phone, firstName } = req.body;
    const cleanPhone = normalizePhone(phone || '');
    if (!cleanPhone) return res.status(400).json({ error: "Numéro de téléphone requis" });

    try {
      const { data: user } = await supabase.from('users').select('*').eq('phone', cleanPhone).maybeSingle();
      if (user) {
        await supabase.from('users').update({ role: 'admin' }).eq('id', user.id);
        await supabase.from('system_logs').insert({
          id: `log_${genId()}`, action: "Promotion Administrateur",
          details: `${req.adminUser.firstName} a promu ${user.first_name} (${cleanPhone}) au rôle admin`,
          timestamp: new Date().toISOString()
        });
      } else {
        const id = `admin_${genId()}`;
        const referralCode = `PRO-${genId().toUpperCase()}`;
        const name = firstName || "Admin Associé";
        await supabase.from('users').insert({ id, first_name: name, phone: cleanPhone, referral_code: referralCode, role: 'admin' });
        await supabase.from('system_logs').insert({
          id: `log_${genId()}`, action: "Création Administrateur",
          details: `${req.adminUser.firstName} a créé l'administrateur ${name} (${cleanPhone})`,
          timestamp: new Date().toISOString()
        });
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

startServer();
