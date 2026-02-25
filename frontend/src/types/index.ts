export type Role = "admin" | "researcher" | "student";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: number;
  name: string;
  category: string;
  description?: string;
  quantity: number;
  available_quantity: number;
  status: "available" | "maintenance" | "retired";
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  user_id: number;
  equipment_id: number;
  quantity: number;
  start_time: string;
  end_time: string;
  purpose?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  equipment?: Equipment;
}

export interface DashboardStats {
  total_equipment: number;
  available_equipment: number;
  total_users: number;
  pending_bookings: number;
  approved_bookings: number;
  total_bookings: number;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}
