export type Category = 'Alimentaire' | 'Cash' | 'Baby Mama' | 'Immobilier' | 'Terrain' | 'Voyage' | 'Épargne';

export interface User {
  id: string;
  firstName: string;
  phone: string;
  selfieUrl: string;
  balance: number;
  referralCode: string;
  referredBy?: string;
  role: 'user' | 'admin';
}

export interface Formula {
  id: string;
  categoryId: Category;
  title: string;
  amountPerPayment: number;
  currency: string;
  durationMonths: number;
  totalPayments: number;
  description: string;
}

export interface UserTontine {
  id: string;
  userId: string;
  formulaId: string;
  paymentsMade: number;
  startDate: string;
  status: 'active' | 'completed';
}

export interface Bubble {
  id: string;
  formulaId: string;
  participants: { userId: string; anonymizedName: string }[];
}

export interface ReferralReward {
  id: string;
  referrerId: string;
  refereeId: string;
  amount: number;
  status: 'pending' | 'paid';
}

export interface SupportMessage {
  id: string;
  userId: string;
  type: 'text' | 'voice';
  content: string;
  isAdmin: boolean;
  timestamp: string;
}

export interface Group {
  id: string;
  name: string;
  stake: number;
  maxMembers: number;
  durationDays: number;
  status: 'open' | 'active' | 'completed';
  currentMembersCount: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  positions: string;
  joinedAt: string;
}

export interface MyCard {
  id: string;
  userId: string;
  title: string;
  dailyAmount: number;
  totalDays: number;
  createdAt: string;
  payments?: CardPayment[];
}

export interface CardPayment {
  id: string;
  cardId: string;
  dayIndex: number;
  amount: number;
  isCommission: boolean;
  paidAt: string;
}

