// ─── Domain types ─────────────────────────────────────────────────────────────

export type Role = 'CUSTOMER' | 'ADMIN';

export interface User {
  userId:            string;
  email:             string;
  full_name:         string;
  phone?:            string;
  role:              Role;
  biometric_enrolled: boolean;
}

export interface Category {
  category_id: string;
  name:        string;
  slug:        string;
  description?: string;
}

export interface Product {
  product_id:  string;
  name:        string;
  description: string;
  price:       string | number;
  stock_qty:   number;
  image_url?:  string | null;
  category_id: string;
  is_active:   boolean;
  created_at:  string;
  category?:   Pick<Category, 'name' | 'slug'>;
}

export interface CartItem {
  cart_item_id: string;
  user_id:      string;
  product_id:   string;
  quantity:     number;
  product:      Product;
  available:    boolean;
}

export interface Cart {
  items:    CartItem[];
  total:    number;
  itemCount: number;
}

export type OrderStatus   = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID'  | 'PENDING'   | 'PAID'    | 'FAILED'    | 'REFUNDED';

export interface ShippingAddress {
  street:     string;
  city:       string;
  state:      string;
  country:    string;
  postalCode: string;
}

export interface OrderItem {
  order_item_id: string;
  order_id:      string;
  product_id:    string;
  quantity:      number;
  unit_price:    string | number;
  subtotal:      string | number;
  product?:      Pick<Product, 'name' | 'image_url'>;
}

export interface Order {
  order_id:         string;
  user_id:          string;
  status:           OrderStatus;
  payment_status:   PaymentStatus;
  total_amount:     string | number;
  shipping_address: ShippingAddress;
  created_at:       string;
  updated_at:       string;
  order_items?:     OrderItem[];
  payment?:         { status: PaymentStatus; tx_ref?: string } | null;
}

export interface Payment {
  payment_id:   string;
  order_id:     string;
  tx_ref:       string;
  amount:       string | number;
  currency:     string;
  status:       PaymentStatus;
  provider_ref?: string | null;
  created_at:   string;
}

export interface WebAuthnCredential {
  credential_id: string;
  device_type?:  string | null;
  transports:    string[];
  created_at:    string;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?:   T;
  message?: string;
  error?:  string;
  errors?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  success:    boolean;
  data:       T[];
  total:      number;
  page:       number;
  totalPages: number;
  limit:      number;
}

// ─── Auth API payloads ────────────────────────────────────────────────────────

export interface RegisterPayload {
  email:     string;
  password:  string;
  full_name: string;
  phone:     string;
}

export interface LoginPayload {
  email:    string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user:        User;
}

export interface RegisterResponse {
  userId:  string;
  message: string;
  otp?:    string; // dev-only
}
