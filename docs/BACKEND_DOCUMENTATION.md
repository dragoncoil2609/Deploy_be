# Tài liệu Backend - Mini E-Commerce API

## 📋 Tổng quan

**Mini E-Commerce** là một hệ thống backend e-commerce được xây dựng bằng **NestJS** (TypeScript), sử dụng **MySQL** làm database chính và **TypeORM** làm ORM. Hệ thống hỗ trợ đầy đủ các tính năng: quản lý người dùng, shop, sản phẩm, đơn hàng, giỏ hàng, đánh giá, và nhiều tính năng nâng cao khác.

### Thông tin cơ bản
- **Framework**: NestJS v11
- **Language**: TypeScript
- **Database**: MySQL (hỗ trợ PostgreSQL)
- **ORM**: TypeORM v0.3.27
- **Authentication**: JWT (Access Token + Refresh Token)
- **Validation**: class-validator + class-transformer
- **Email**: Nodemailer
- **File Upload**: Multer (tích hợp sẵn)

---

## 🏗️ Kiến trúc tổng quan

### Cấu trúc thư mục chính

```
src/
├── main.ts                    # Entry point, cấu hình CORS, validation, global filters
├── app.module.ts              # Root module, import tất cả modules
├── app.controller.ts          # Controller gốc
├── app.service.ts             # Service gốc
│
├── common/                    # Shared utilities
│   ├── constants/             # Constants (roles, meta-keys)
│   ├── decorators/           # Custom decorators (@CurrentUser, @Public, @Roles)
│   ├── filters/              # Exception filters (ApiExceptionFilter)
│   ├── guards/               # Auth guards (AccessTokenGuard, RolesGuard, ActiveUserGuard)
│   ├── interceptors/         # Response interceptors
│   └── pipes/                 # Custom pipes
│
├── config/                    # Configuration files
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── mail.config.ts
│   └── redis.config.ts
│
├── database/                  # Database setup
│   ├── data-source.ts        # TypeORM data source
│   └── migrations/           # Database migrations
│
├── modules/                   # Business logic modules
│   ├── auth/                 # Authentication & Authorization
│   ├── users/                # User management
│   ├── shops/                # Shop management
│   ├── products/             # Product management
│   ├── orders/               # Order management
│   ├── cart/                 # Shopping cart
│   ├── addresses/            # User addresses
│   ├── reviews/              # Product reviews
│   ├── categories/           # Product categories
│   ├── storage/              # File upload/storage
│   ├── email/                # Email service
│   ├── notification/         # WebSocket notifications
│   ├── search/               # Search functionality
│   ├── ai/                   # AI services (recommendations, sentiment)
│   ├── analytics/            # Analytics service
│   └── health/               # Health check
│
├── infra/                     # Infrastructure services
│   ├── cache/                # Redis cache
│   ├── mail/                 # Mail client
│   └── search/                # Elasticsearch client
│
├── jobs/                      # Background jobs (Bull queues)
│   ├── queues/               # Queue definitions
│   └── processors/           # Job processors
│
└── events/                    # Event emitters
    └── *.events.ts           # Event definitions
```

---

## 🔐 Authentication & Authorization

### Hệ thống xác thực

1. **JWT Token System**
   - **Access Token**: Ngắn hạn (mặc định 15 phút), chứa `sub` (user id), `email`, `role`
   - **Refresh Token**: Dài hạn (mặc định 7 ngày), chỉ chứa `sub`, lưu trong **HTTP-only cookie**
   - **Secrets**: Tách biệt cho access và refresh token

2. **Guards (Bảo vệ routes)**
   - `AccessTokenGuard`: Mặc định yêu cầu JWT cho tất cả routes (trừ `@Public()`)
   - `ActiveUserGuard`: Kiểm tra tài khoản có bị xóa mềm (soft delete) hay không
   - `RolesGuard`: Phân quyền dựa trên `@Roles()` decorator

3. **Decorators**
   - `@Public()`: Đánh dấu endpoint công khai (không cần JWT)
   - `@CurrentUser()`: Lấy thông tin user từ JWT payload
   - `@Roles()`: Yêu cầu role cụ thể (USER, SELLER, ADMIN)

### Luồng xác thực

```
1. Register → Tạo user (isVerified = false)
2. Request Verify → Gửi OTP qua email
3. Verify Account → Xác nhận OTP → isVerified = true
4. Login → Trả access_token (header) + refresh_token (cookie)
5. Refresh → Dùng refresh_token (cookie) → Trả access_token mới
6. Logout → Xóa refresh_token cookie
```

### Khôi phục tài khoản (Account Recovery)

- **Bước 1**: `POST /auth/account/recover/request` → Gửi OTP
- **Bước 2**: `POST /auth/account/recover/confirm` → Xác nhận OTP + đổi mật khẩu + restore account

---

## 👥 Module: Users

### Entity: User

```typescript
{
  id: number (PK, auto increment)
  name: string (120 chars)
  email: string (320 chars, unique)
  phone?: string (20 chars, nullable)
  passwordHash: string (bcrypt, không select mặc định)
  avatarUrl?: string (text, nullable)
  birthday?: string (date, nullable)
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
  otp?: string (nullable, dùng cho verify/reset)
  timeOtp?: Date (nullable)
  isVerified: boolean (default: false)
  role: 'USER' | 'SELLER' | 'ADMIN' (default: USER)
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date (soft delete)
  
  // Relations
  shop?: Shop (OneToOne)
}
```

### API Endpoints

- `GET /users/me` - Lấy thông tin user hiện tại
- `PATCH /users/me` - Cập nhật thông tin user (name, phone, gender, birthday, avatarUrl)
- `DELETE /users/me` - Xóa mềm tài khoản
- `GET /users/:id` - Lấy user theo ID (ADMIN only)
- `PATCH /users/:id` - Cập nhật user (ADMIN only)
- `DELETE /users/:id` - Xóa mềm user (ADMIN only)
- `POST /users/:id/restore` - Khôi phục user đã xóa

### Tính năng đặc biệt

- **Soft Delete**: User bị xóa mềm (deletedAt != null) không thể login, cần khôi phục
- **Role tự động**: Khi tạo shop, role tự động chuyển từ USER → SELLER
- **OTP System**: Dùng cho verify account và reset password (6 số, hết hạn sau 5 phút)

---

## 🏪 Module: Shops

### Entity: Shop

```typescript
{
  id: number (PK)
  userId: number (FK → users.id, unique, RESTRICT on delete)
  name: string (150 chars)
  slug: string (180 chars, unique, tự động tạo từ name)
  description?: string (255 chars, nullable)
  logoUrl?: string (255 chars, nullable)
  coverUrl?: string (255 chars, nullable)
  phone?: string (30 chars, nullable)
  email?: string (150 chars, nullable)
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' (default: PENDING)
  verifiedAt?: Date (nullable)
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date (soft delete)
  
  // Relations
  user: User (OneToOne)
  stats: ShopStats (OneToOne, cascade)
  products: Product[] (OneToMany)
}
```

### Entity: ShopStats

```typescript
{
  id: number (PK)
  shopId: number (FK → shops.id, unique, CASCADE on delete)
  productCount: number (default: 0)
  orderCount: number (default: 0)
  ratingAvg: decimal(3,2) (default: 0)
  reviewCount: number (default: 0)
  createdAt: Date
  updatedAt: Date
}
```

### API Endpoints

- `POST /shops/register` hoặc `POST /shops` - Đăng ký shop mới
- `GET /shops/check-name?name=...` - Kiểm tra tên shop đã tồn tại chưa
- `GET /shops` - Danh sách shop (public, có phân trang, filter)
- `GET /shops/:id` - Chi tiết shop (public)
- `GET /shops/me` - Shop của user hiện tại
- `PATCH /shops/:id` - Cập nhật shop (chủ shop hoặc ADMIN)
- `DELETE /shops/:id` - Xóa shop (hard delete, cascade xóa products, revert role SELLER → USER)

### Tính năng đặc biệt

- **Slug tự động**: Tạo slug unique từ name (ví dụ: "My Shop" → "my-shop", nếu trùng → "my-shop-1")
- **1 User = 1 Shop**: Constraint unique trên userId
- **Transaction**: Khi tạo shop, tự động tạo ShopStats và đổi role USER → SELLER trong transaction
- **Cascade Delete**: Xóa shop → xóa cứng products, images, variants, shop_stats

---

## 📦 Module: Products

### Entity: Product

```typescript
{
  id: number (PK)
  shopId: number (FK → shops.id, CASCADE on delete)
  name: string
  description?: string
  basePrice: number (decimal)
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date (soft delete)
  
  // Relations
  shop: Shop (ManyToOne)
  variants: ProductVariant[] (OneToMany)
  images: ProductImage[] (OneToMany)
  reviews: Review[] (OneToMany)
}
```

### Entity: ProductVariant

```typescript
{
  id: number (PK)
  productId: number (FK → products.id, CASCADE)
  sku?: string (unique, nullable)
  name: string (ví dụ: "Size M, Color Red")
  price: number (decimal, override basePrice)
  stock: number (default: 0)
  attributes: JSON (ví dụ: {"size": "M", "color": "Red"})
  createdAt: Date
  updatedAt: Date
}
```

### Entity: ProductImage

```typescript
{
  id: number (PK)
  productId: number (FK → products.id, CASCADE)
  url: string
  order: number (default: 0, để sắp xếp)
  createdAt: Date
}
```

### API Endpoints

- `POST /products` - Tạo sản phẩm mới
- `GET /products` - Danh sách sản phẩm (có search, filter, phân trang)
- `GET /products/:id` - Chi tiết sản phẩm
- `PATCH /products/:id` - Cập nhật sản phẩm
- `DELETE /products/:id` - Xóa mềm sản phẩm
- `POST /products/:id/variants` - Tạo variants cho sản phẩm
- `POST /products/generate-variants` - Tự động generate variants từ attributes
- `PATCH /products/variants/:variantId` - Cập nhật variant
- `DELETE /products/variants/:variantId` - Xóa variant

---

## 🛒 Module: Cart

### Entity: Cart

```typescript
{
  id: number (PK)
  userId: number (FK → users.id, unique)
  createdAt: Date
  updatedAt: Date
  
  // Relations
  items: CartItem[] (OneToMany)
}
```

### Entity: CartItem

```typescript
{
  id: number (PK)
  cartId: number (FK → carts.id, CASCADE)
  productId: number (FK → products.id)
  variantId?: number (FK → product_variants.id, nullable)
  quantity: number (default: 1)
  createdAt: Date
  updatedAt: Date
  
  // Relations
  cart: Cart (ManyToOne)
  product: Product (ManyToOne)
  variant?: ProductVariant (ManyToOne)
}
```

### API Endpoints

- `GET /cart` - Lấy giỏ hàng hiện tại (tự động tạo nếu chưa có)
- `POST /cart/items` - Thêm item vào giỏ
- `PATCH /cart/items/:itemId` - Cập nhật số lượng
- `DELETE /cart/items/:itemId` - Xóa item khỏi giỏ
- `DELETE /cart` - Xóa toàn bộ giỏ hàng

---

## 📋 Module: Orders

### Entity: Order

```typescript
{
  id: number (PK)
  userId: number (FK → users.id)
  shopId: number (FK → shops.id)
  addressId: number (FK → addresses.id)
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  paymentMethod: string
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED'
  totalAmount: number (decimal)
  note?: string
  createdAt: Date
  updatedAt: Date
  
  // Relations
  user: User (ManyToOne)
  shop: Shop (ManyToOne)
  address: Address (ManyToOne)
  items: OrderItem[] (OneToMany)
}
```

### Entity: OrderItem

```typescript
{
  id: number (PK)
  orderId: number (FK → orders.id, CASCADE)
  productId: number (FK → products.id)
  variantId?: number (FK → product_variants.id, nullable)
  productName: string (snapshot tại thời điểm đặt)
  variantName?: string (snapshot)
  price: number (decimal, snapshot)
  quantity: number
  subtotal: number (decimal, price * quantity)
}
```

### API Endpoints

- `POST /orders` - Tạo đơn hàng mới (từ cart hoặc trực tiếp)
- `GET /orders` - Danh sách đơn hàng của user (có filter, phân trang)
- `GET /orders/:id` - Chi tiết đơn hàng
- `PATCH /orders/:id/status` - Cập nhật trạng thái (SELLER hoặc ADMIN)

---

## 📍 Module: Addresses

### Entity: Address

```typescript
{
  id: number (PK)
  userId: number (FK → users.id, CASCADE)
  fullName: string
  phone: string
  address: string
  ward?: string
  district?: string
  province?: string
  postalCode?: string
  isDefault: boolean (default: false)
  createdAt: Date
  updatedAt: Date
}
```

### API Endpoints

- `POST /addresses` - Tạo địa chỉ mới
- `GET /addresses` - Danh sách địa chỉ của user
- `GET /addresses/:id` - Chi tiết địa chỉ
- `PATCH /addresses/:id` - Cập nhật địa chỉ
- `DELETE /addresses/:id` - Xóa địa chỉ

---

## ⭐ Module: Reviews

### Entity: Review

```typescript
{
  id: number (PK)
  userId: number (FK → users.id)
  productId: number (FK → products.id, CASCADE)
  orderId?: number (FK → orders.id, nullable, để verify đã mua)
  rating: number (1-5)
  comment?: string
  images?: string[] (JSON array)
  helpfulCount: number (default: 0)
  createdAt: Date
  updatedAt: Date
  
  // Relations
  user: User (ManyToOne)
  product: Product (ManyToOne)
  votes: ReviewVote[] (OneToMany)
}
```

### Entity: ReviewVote

```typescript
{
  id: number (PK)
  reviewId: number (FK → reviews.id, CASCADE)
  userId: number (FK → users.id)
  isHelpful: boolean
  createdAt: Date
}
```

### API Endpoints

- `POST /reviews` - Tạo review
- `GET /reviews/product/:productId` - Danh sách review của sản phẩm
- `GET /reviews/:id` - Chi tiết review
- `PATCH /reviews/:id` - Cập nhật review (chỉ chủ review)
- `DELETE /reviews/:id` - Xóa review
- `POST /reviews/:id/vote` - Vote helpful/not helpful

---

## 📁 Module: Storage (File Upload)

### API Endpoints

- `POST /files/upload` - Upload file (multipart/form-data, field: `file`)
  - Hỗ trợ: images, documents
  - Lưu vào thư mục `uploads/`
  - Serve static tại `/uploads/:filename`

### Cấu hình

- Serve static files từ `uploads/` tại route `/uploads`
- File được lưu với tên unique (timestamp + random)

---

## 🔍 Module: Search

- Tích hợp Elasticsearch (tùy chọn)
- Search products theo tên, mô tả, category
- Có mapper để transform data

---

## 🤖 Module: AI

- **Recommendation Service**: Gợi ý sản phẩm dựa trên lịch sử
- **Sentiment Service**: Phân tích sentiment từ reviews

---

## 📊 Module: Analytics

- Thống kê doanh thu, đơn hàng, sản phẩm
- Tích hợp với background jobs

---

## 🔔 Module: Notification

- WebSocket gateway cho real-time notifications
- Thông báo đơn hàng, review, v.v.

---

## 📧 Module: Email

### Templates

- `activation.html` - Email kích hoạt tài khoản (OTP)
- `reset-password.html` - Email reset mật khẩu (OTP)

### Service

- Gửi email qua Nodemailer
- Hỗ trợ HTML templates

---

## ⚙️ Cấu hình môi trường

### Biến môi trường quan trọng

```env
# App
NODE_ENV=development|production
PORT=3000
APP_NAME=Mini E-Commerce

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=password
DB_NAME=mini_ecommerce
DB_SSL=false

# JWT
ACCESS_TOKEN_SECRET=your_secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRES=7d
REFRESH_COOKIE_NAME=refreshToken

# Password
BCRYPT_SALT_ROUNDS=12
BCRYPT_PEPPER=optional_pepper

# OTP
OTP_WINDOW_MINUTES=5
OTP_RESEND_COOLDOWN_SECONDS=60

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_password
MAIL_FROM=noreply@minie.com

# CORS
CORS_ORIGINS=http://localhost:5173,https://example.com

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch (optional)
ELASTICSEARCH_NODE=http://localhost:9200
```

---

## 🛡️ Security Features

1. **Password Hashing**: Bcrypt với salt rounds và optional pepper
2. **JWT Security**: Tách biệt access/refresh token, HTTP-only cookie cho refresh token
3. **CORS**: Cấu hình whitelist origins, hỗ trợ credentials
4. **Validation**: class-validator cho tất cả DTOs
5. **Soft Delete**: Không xóa cứng dữ liệu quan trọng
6. **Role-based Access Control**: Guards và decorators
7. **OTP System**: 6 số, hết hạn sau 5 phút, cooldown 60 giây

---

## 📝 Response Format

Tất cả API responses đều theo format:

```typescript
{
  success: boolean
  statusCode: number
  data: any
  message?: string
  error?: string
}
```

### Error Response

```typescript
{
  success: false
  statusCode: 400|401|403|404|409|500
  message: string | string[]  // Validation errors có thể là array
  error: string  // Error type (Bad Request, Conflict, etc.)
}
```

---

## 🗄️ Database Schema Overview

### Core Tables

1. **users** - Người dùng
2. **shops** - Cửa hàng
3. **shop_stats** - Thống kê shop
4. **products** - Sản phẩm
5. **product_variants** - Biến thể sản phẩm
6. **product_images** - Hình ảnh sản phẩm
7. **categories** - Danh mục
8. **carts** - Giỏ hàng
9. **cart_items** - Item trong giỏ
10. **orders** - Đơn hàng
11. **order_items** - Item trong đơn
12. **addresses** - Địa chỉ
13. **reviews** - Đánh giá
14. **review_votes** - Vote đánh giá

### Relationships

- User 1:1 Shop
- Shop 1:1 ShopStats
- Shop 1:N Products
- Product 1:N Variants
- Product 1:N Images
- User 1:1 Cart
- Cart 1:N CartItems
- User 1:N Orders
- Order 1:N OrderItems
- User 1:N Addresses
- User 1:N Reviews
- Product 1:N Reviews

---

## 🚀 Scripts

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Database
npm run db:migration:generate  # Tạo migration mới
npm run db:migration:run       # Chạy migrations
npm run db:migration:revert    # Rollback migration

# Testing
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
```

---

## 📌 Lưu ý quan trọng

1. **Global Guards**: Tất cả routes mặc định yêu cầu JWT, trừ khi có `@Public()`
2. **Soft Delete**: User/Shop/Product bị xóa mềm không hiển thị trong queries thông thường
3. **Transactions**: Các thao tác quan trọng (tạo shop, đơn hàng) dùng transaction
4. **Cascade**: Xóa shop → xóa products, xóa product → xóa variants/images
5. **Slug**: Shop slug tự động tạo, unique, dùng cho SEO-friendly URLs
6. **OTP**: Có cooldown để tránh spam, hết hạn sau 5 phút
7. **Role Auto-update**: Tạo shop → role USER → SELLER, xóa shop → SELLER → USER

---

## 🔗 API Base URL

- Development: `http://localhost:3000/api`
- Production: Tùy cấu hình

Tất cả endpoints đều có prefix `/api` (cấu hình trong `main.ts`)

---

## 📚 Tài liệu bổ sung

- Swagger UI: `http://localhost:3000/docs` (nếu có)
- Health Check: `GET /health`

---

*Tài liệu này được tạo tự động để hỗ trợ AI hiểu và giải thích về backend Mini E-Commerce.*

