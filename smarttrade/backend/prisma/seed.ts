import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Stable seed IDs (deterministic so upsert is idempotent) ─────────────────

const CATEGORY_IDS = {
  electronics:  'c1000000-0000-4000-a000-000000000001',
  fashion:      'c2000000-0000-4000-a000-000000000002',
  homeGarden:   'c3000000-0000-4000-a000-000000000003',
  sports:       'c4000000-0000-4000-a000-000000000004',
  healthBeauty: 'c5000000-0000-4000-a000-000000000005',
};

const USER_IDS = {
  admin:    'a0000000-0000-4000-a000-000000000001',
  customer: 'a0000000-0000-4000-a000-000000000002',
};

// ─── Categories ───────────────────────────────────────────────────────────────

const categories = [
  { category_id: CATEGORY_IDS.electronics, name: 'Electronics',     slug: 'electronics',   description: 'Gadgets, devices, and tech accessories' },
  { category_id: CATEGORY_IDS.fashion,     name: 'Fashion',         slug: 'fashion',       description: 'Clothing, footwear, and accessories' },
  { category_id: CATEGORY_IDS.homeGarden,  name: 'Home & Garden',   slug: 'home-garden',   description: 'Furniture, décor, and outdoor essentials' },
  { category_id: CATEGORY_IDS.sports,      name: 'Sports',          slug: 'sports',        description: 'Equipment and gear for every sport' },
  { category_id: CATEGORY_IDS.healthBeauty,name: 'Health & Beauty', slug: 'health-beauty', description: 'Wellness, skincare, and personal care' },
];

// ─── Products (6 per category) ────────────────────────────────────────────────

type ProductSeed = {
  product_id:  string;
  name:        string;
  description: string;
  price:       string;
  stock_qty:   number;
  category_id: string;
  image_url:   string | null;
};

const products: ProductSeed[] = [
  // Electronics
  { product_id: 'e1000000-0000-4000-a000-000000000001', name: 'Wireless Noise-Cancelling Headphones', description: 'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and superior sound quality for audiophiles.', price: '199.99', stock_qty: 45, category_id: CATEGORY_IDS.electronics, image_url: null },
  { product_id: 'e2000000-0000-4000-a000-000000000002', name: '4K Ultra HD Smart TV 55"', description: 'Crystal-clear 4K display with HDR10+, built-in streaming apps, and voice control. Transform your living room experience.', price: '499.99', stock_qty: 20, category_id: CATEGORY_IDS.electronics, image_url: null },
  { product_id: 'e3000000-0000-4000-a000-000000000003', name: 'Mechanical Keyboard RGB Backlit', description: 'Tactile blue switches with per-key RGB lighting, anti-ghosting, and durable aluminium frame. Perfect for gaming and productivity.', price: '89.99', stock_qty: 60, category_id: CATEGORY_IDS.electronics, image_url: null },
  { product_id: 'e4000000-0000-4000-a000-000000000004', name: 'Portable Bluetooth Speaker IPX7', description: 'Waterproof 360-degree surround sound speaker with 20-hour playtime, built-in microphone, and USB-C charging.', price: '49.99', stock_qty: 80, category_id: CATEGORY_IDS.electronics, image_url: null },
  { product_id: 'e5000000-0000-4000-a000-000000000005', name: 'GaN Fast Charger 65W USB-C', description: 'Compact GaN technology charger compatible with laptops, tablets, and phones. Charges a MacBook to 50% in 30 minutes.', price: '29.99', stock_qty: 100, category_id: CATEGORY_IDS.electronics, image_url: null },
  { product_id: 'e6000000-0000-4000-a000-000000000006', name: 'USB-C Hub 7-in-1 Multiport Adapter', description: 'Expands a single USB-C port into HDMI 4K, 3×USB-A 3.0, SD/microSD reader, and 100W PD pass-through.', price: '39.99', stock_qty: 75, category_id: CATEGORY_IDS.electronics, image_url: null },

  // Fashion
  { product_id: 'f1000000-0000-4000-a000-000000000001', name: "Men's Classic Oxford Shirt", description: "Premium 100% cotton slim-fit Oxford shirt. Available in multiple colours. Machine washable and wrinkle-resistant.", price: '45.00', stock_qty: 90, category_id: CATEGORY_IDS.fashion, image_url: null },
  { product_id: 'f2000000-0000-4000-a000-000000000002', name: "Women's High-Waist Yoga Pants", description: "Ultra-soft 4-way stretch fabric with moisture-wicking technology. Deep pockets and a flattering high waistband.", price: '35.00', stock_qty: 85, category_id: CATEGORY_IDS.fashion, image_url: null },
  { product_id: 'f3000000-0000-4000-a000-000000000003', name: 'Unisex Canvas Low-Top Sneakers', description: 'Classic vulcanised canvas sneakers with cushioned insole. Versatile design that pairs with any casual outfit.', price: '60.00', stock_qty: 70, category_id: CATEGORY_IDS.fashion, image_url: null },
  { product_id: 'f4000000-0000-4000-a000-000000000004', name: 'Genuine Leather Bifold Wallet', description: 'Full-grain leather wallet with 8 card slots, RFID blocking, and slim profile. A timeless everyday accessory.', price: '25.00', stock_qty: 95, category_id: CATEGORY_IDS.fashion, image_url: null },
  { product_id: 'f5000000-0000-4000-a000-000000000005', name: "Women's Floral Wrap Maxi Dress", description: 'Lightweight chiffon maxi dress with adjustable tie-waist and flattering wrap silhouette. Ideal for any occasion.', price: '55.00', stock_qty: 50, category_id: CATEGORY_IDS.fashion, image_url: null },
  { product_id: 'f6000000-0000-4000-a000-000000000006', name: "Men's Slim-Fit Stretch Chinos", description: 'Modern slim-fit chinos in performance stretch fabric. Wrinkle-resistant and available in 6 colours.', price: '40.00', stock_qty: 65, category_id: CATEGORY_IDS.fashion, image_url: null },

  // Home & Garden
  { product_id: 'h1000000-0000-4000-a000-000000000001', name: 'Stainless Steel Cookware Set 8-Piece', description: 'Professional tri-ply stainless steel cookware with even heat distribution. Oven-safe to 500°F and dishwasher friendly.', price: '120.00', stock_qty: 30, category_id: CATEGORY_IDS.homeGarden, image_url: null },
  { product_id: 'h2000000-0000-4000-a000-000000000002', name: 'Cordless Stick Vacuum Cleaner', description: 'Powerful 22kPa suction with 60-minute battery life. Converts to a handheld for stairs and car interiors.', price: '75.00', stock_qty: 40, category_id: CATEGORY_IDS.homeGarden, image_url: null },
  { product_id: 'h3000000-0000-4000-a000-000000000003', name: 'Full-Spectrum Indoor Grow Light', description: 'Energy-efficient LED grow light with adjustable brightness and 12/18h timer. Covers a 3×3 ft grow area.', price: '35.00', stock_qty: 55, category_id: CATEGORY_IDS.homeGarden, image_url: null },
  { product_id: 'h4000000-0000-4000-a000-000000000004', name: 'Contour Memory Foam Pillow', description: 'Ergonomic cervical support pillow with removable bamboo cover. Reduces neck pain and improves sleep quality.', price: '45.00', stock_qty: 60, category_id: CATEGORY_IDS.homeGarden, image_url: null },
  { product_id: 'h5000000-0000-4000-a000-000000000005', name: 'Bamboo Cutting Board Set of 3', description: 'Eco-friendly bamboo boards in small, medium, and large sizes with juice grooves and non-slip feet.', price: '30.00', stock_qty: 78, category_id: CATEGORY_IDS.homeGarden, image_url: null },
  { product_id: 'h6000000-0000-4000-a000-000000000006', name: 'Smart RGBW LED Bulb 4-Pack', description: 'Wi-Fi enabled colour-changing bulbs compatible with Alexa and Google Home. Set schedules and scenes via app.', price: '25.00', stock_qty: 88, category_id: CATEGORY_IDS.homeGarden, image_url: null },

  // Sports
  { product_id: 's1000000-0000-4000-a000-000000000001', name: 'Adjustable Dumbbell Set 5–50 lbs', description: 'Space-saving adjustable dumbbells that replace 15 pairs. Quick-change dial system for a full home gym workout.', price: '299.99', stock_qty: 15, category_id: CATEGORY_IDS.sports, image_url: null },
  { product_id: 's2000000-0000-4000-a000-000000000002', name: 'Non-Slip Yoga Mat 6mm', description: 'Extra-thick eco-friendly TPE yoga mat with alignment lines and carrying strap. Odour-resistant and sweat-proof.', price: '30.00', stock_qty: 90, category_id: CATEGORY_IDS.sports, image_url: null },
  { product_id: 's3000000-0000-4000-a000-000000000003', name: 'Resistance Bands Set of 5', description: 'Progressive resistance from 10 to 50 lbs. Latex-free bands with door anchor, handles, and ankle straps included.', price: '20.00', stock_qty: 100, category_id: CATEGORY_IDS.sports, image_url: null },
  { product_id: 's4000000-0000-4000-a000-000000000004', name: 'Insulated Stainless Steel Water Bottle 32oz', description: 'Triple-wall vacuum insulation keeps drinks cold 24h / hot 12h. BPA-free and leak-proof flip lid.', price: '25.00', stock_qty: 95, category_id: CATEGORY_IDS.sports, image_url: null },
  { product_id: 's5000000-0000-4000-a000-000000000005', name: "Men's Lightweight Running Shoes", description: 'Breathable mesh upper with responsive foam midsole. Engineered for neutral runners seeking speed and comfort.', price: '89.99', stock_qty: 55, category_id: CATEGORY_IDS.sports, image_url: null },
  { product_id: 's6000000-0000-4000-a000-000000000006', name: 'Speed Jump Rope Steel Cable', description: 'Competition-grade aluminium handles with ball bearings. Adjustable 9ft cable for double-unders and HIIT training.', price: '15.00', stock_qty: 98, category_id: CATEGORY_IDS.sports, image_url: null },

  // Health & Beauty
  { product_id: 'b1000000-0000-4000-a000-000000000001', name: 'Vitamin C + Hyaluronic Acid Serum 30ml', description: 'Brightening serum with 20% vitamin C, ferulic acid, and hyaluronic acid. Reduces hyperpigmentation and boosts radiance.', price: '35.00', stock_qty: 70, category_id: CATEGORY_IDS.healthBeauty, image_url: null },
  { product_id: 'b2000000-0000-4000-a000-000000000002', name: 'Electric Sonic Toothbrush Pro', description: '62,000 strokes/min with 5 cleaning modes, 2-minute timer, and pressure sensor. Includes 3 brush heads.', price: '49.99', stock_qty: 50, category_id: CATEGORY_IDS.healthBeauty, image_url: null },
  { product_id: 'b3000000-0000-4000-a000-000000000003', name: 'Collagen Sheet Face Mask Set 10-Pack', description: 'Hydrating collagen masks infused with green tea and vitamin E. Firms and moisturises in just 20 minutes.', price: '20.00', stock_qty: 85, category_id: CATEGORY_IDS.healthBeauty, image_url: null },
  { product_id: 'b4000000-0000-4000-a000-000000000004', name: 'Organic Aloe Vera Gel 500ml', description: '99.5% pure aloe vera gel, cold-processed and preservative-free. Soothes sunburns, moisturises, and calms irritation.', price: '15.00', stock_qty: 92, category_id: CATEGORY_IDS.healthBeauty, image_url: null },
  { product_id: 'b5000000-0000-4000-a000-000000000005', name: 'Biotin Hair Growth Vitamins 90 Capsules', description: 'High-potency 10,000 mcg biotin with zinc, selenium, and bamboo extract. Supports thicker, stronger hair in 60 days.', price: '25.00', stock_qty: 78, category_id: CATEGORY_IDS.healthBeauty, image_url: null },
  { product_id: 'b6000000-0000-4000-a000-000000000006', name: 'Essential Oils Starter Set 6 Bottles', description: 'Therapeutic-grade lavender, peppermint, eucalyptus, tea tree, lemon, and frankincense. 10ml each, 100% pure.', price: '40.00', stock_qty: 62, category_id: CATEGORY_IDS.healthBeauty, image_url: null },
];

// ─── Main seed function ───────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding SmartTrade database...\n');

  // Categories — upsert on `slug` (stable unique field, never the PK)
  console.log('  → Upserting categories...');
  for (const cat of categories) {
    await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: cat,
    });
  }
  console.log(`  ✓ ${categories.length} categories seeded`);

  // Products — delete-then-recreate; no natural unique key beyond product_id.
  // Scoped delete targets only known seed IDs so real data is never touched.
  console.log('  → Refreshing products...');
  const seedProductIds = products.map((p) => p.product_id);
  await prisma.product.deleteMany({ where: { product_id: { in: seedProductIds } } });
  await prisma.product.createMany({ data: products });
  console.log(`  ✓ ${products.length} products seeded`);

  // Admin user
  console.log('  → Upserting admin user...');
  const adminHash = await bcrypt.hash('Admin@1234', 12);
  await prisma.user.upsert({
    where:  { email: 'admin@smarttrade.test' },
    update: { password_hash: adminHash, role: Role.ADMIN, is_verified: true },
    create: {
      user_id:       USER_IDS.admin,
      email:         'admin@smarttrade.test',
      password_hash: adminHash,
      full_name:     'SmartTrade Admin',
      role:          Role.ADMIN,
      is_verified:   true,
    },
  });
  console.log('  ✓ Admin user  → admin@smarttrade.test / Admin@1234');

  // Test customer
  console.log('  → Upserting test customer...');
  const customerHash = await bcrypt.hash('Customer@1234', 12);
  await prisma.user.upsert({
    where:  { email: 'customer@smarttrade.test' },
    update: { password_hash: customerHash, is_verified: true },
    create: {
      user_id:       USER_IDS.customer,
      email:         'customer@smarttrade.test',
      password_hash: customerHash,
      full_name:     'Test Customer',
      role:          Role.CUSTOMER,
      is_verified:   true,
    },
  });
  console.log('  ✓ Customer    → customer@smarttrade.test / Customer@1234');

  console.log('\n✅ Seed complete.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
