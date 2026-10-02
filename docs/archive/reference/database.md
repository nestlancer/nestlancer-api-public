## 📖 Table of Contents

- [1. Overview](#1-overview)
- [2. Schema Definition](#2-schema-definition)
- [3. Key Relationships](#3-key-relationships)
- [4. Indexes & Performance](#4-indexes-performance)

---

## 1. Overview

This document defines the database architecture for the Nestlancer project. It translates the endpoint requirements, architectural patterns, and business domains into a highly scalable, robust PostgreSQL schema using the Prisma ORM.

### Design Philosophy

- **Scalability & Performance**: Extensive use of indexes on foreign keys, status fields, and lookup tokens (slugs, idempotency keys).
- **Security & Auditing**: Immutable `AuditLog` for admin actions and `deletedAt` for soft-deletion of critical entities (Users, Projects).
- **Reliability Architectures**: Implementation of the Transactional Outbox pattern (`OutboxEvent`), Inbound Webhook Ingestion (`WebhookLog`), and Idempotency key tracking (`IdempotencyKey`).
- **Referential Integrity**: Strategic use of cascading rules to maintain database health, balancing hard deletes with soft deletes on the application level.
- **Normalization vs. Performance**: Core relationships are fully normalized, while flexible data structures (e.g., timeline, technical details) use `Json` columns to prevent over-architecting.

---

## 2. Schema Definition

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------

enum UserRole {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  DELETED
}

enum RequestStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  QUOTED
  ACCEPTED
  REJECTED
  CONVERTED_TO_PROJECT
  CHANGES_REQUESTED
  CANCELLED
}

enum QuoteStatus {
  DRAFT
  PENDING
  SENT
  VIEWED
  ACCEPTED
  DECLINED
  EXPIRED
  CHANGES_REQUESTED
  REVISED
}

enum ProjectStatus {
  CREATED
  PENDING_PAYMENT
  IN_PROGRESS
  REVIEW
  COMPLETED
  ARCHIVED
  CANCELLED
  REVISION_REQUESTED
  ON_HOLD
}

enum MilestoneStatus {
  PENDING
  IN_PROGRESS
  REVIEW
  COMPLETED
  CANCELLED
}

enum DeliverableStatus {
  PENDING
  IN_PROGRESS
  READY_FOR_REVIEW
  REVISION_REQUESTED
  APPROVED
  REJECTED
}

enum PaymentStatus {
  CREATED
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}

enum MessageType {
  TEXT
  FILE
  SYSTEM
  NOTIFICATION
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  CRITICAL
}

enum MediaStatus {
  PENDING
  PROCESSING
  READY
  FAILED
  QUARANTINED
}

enum MediaVisibility {
  PRIVATE
  PUBLIC
}

enum PortfolioStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum BlogStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
  ARCHIVED
}

enum CommentStatus {
  PENDING
  APPROVED
  REJECTED
  SPAM
}

enum ContactStatus {
  NEW
  READ
  RESPONDED
  ARCHIVED
  SPAM
}

enum ContactSubject {
  GENERAL
  SUPPORT
  BUG_REPORT
  PARTNERSHIP
  OTHER
}

enum OutboxStatus {
  PENDING
  PUBLISHED
  FAILED
}

enum WebhookIngestionStatus {
  PENDING
  PROCESSED
  FAILED
}

// -----------------------------------------------------------------------------
// CORE DOMAIN: USERS & AUTH
// -----------------------------------------------------------------------------

model User {
  id               String       @id @default(uuid(7))
  email            String       @unique
  passwordHash     String
  name             String
  role             UserRole     @default(USER)
  status           UserStatus   @default(ACTIVE)
  twoFactorEnabled Boolean      @default(false)
  twoFactorSecret  String?
  lastLoginAt      DateTime?
  deletedAt        DateTime?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  preferences      UserPreference?
  sessions         Session[]
  requests         ProjectRequest[]
  clientProjects   Project[]       @relation("ClientProjects")
  adminProjects    Project[]       @relation("AdminProjects")
  payments         Payment[]
  messages         Message[]
  notifications    Notification[]
  mediaUploaded    Media[]
  blogPosts        BlogPost[]
  blogComments     BlogComment[]
  auditLogs        AuditLog[]
  systemConfigs    SystemConfig[]

  @@index([email])
  @@index([role])
}

model UserPreference {
  id                   String   @id @default(uuid(7))
  userId               String   @unique
  notificationSettings Json?
  marketingSettings    Json?
  privacySettings      Json?
  theme                String   @default("system")
  timezone             String   @default("UTC")
  language             String   @default("en")
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Session {
  id           String   @id @default(uuid(7))
  userId       String
  token        String   @unique
  ip           String?
  userAgent    String?
  deviceInfo   Json?
  locationData Json?
  expiresAt    DateTime
  lastActiveAt DateTime @default(now())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

// -----------------------------------------------------------------------------
// CORE DOMAIN: REQUESTS & QUOTES
// -----------------------------------------------------------------------------

model ProjectRequest {
  id          String        @id @default(uuid(7))
  userId      String
  title       String
  description String
  category    String
  budgetMin   Int?
  budgetMax   Int?
  currency    String        @default("INR")
  timeframe   String?
  status      RequestStatus @default(DRAFT)
  deletedAt   DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  quote       Quote?

  @@index([userId])
  @@index([status])
}

model Quote {
  id               String      @id @default(uuid(7))
  requestId        String      @unique
  projectId        String?     @unique
  title            String
  description      String
  totalAmount      Int
  currency         String      @default("INR")
  validUntil       DateTime
  status           QuoteStatus @default(DRAFT)
  terms            String?
  notes            String?
  paymentBreakdown Json?
  timeline         Json?
  scope            Json?
  technicalDetails Json?
  acceptedAt       DateTime?
  declinedAt       DateTime?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  request          ProjectRequest @relation(fields: [requestId], references: [id], onDelete: Restrict)
  project          Project?

  @@index([status])
}

// -----------------------------------------------------------------------------
// CORE DOMAIN: PROJECTS & PROGRESS
// -----------------------------------------------------------------------------

model Project {
  id              String        @id @default(uuid(7))
  quoteId         String        @unique
  clientId        String
  adminId         String?
  title           String
  description     String
  status          ProjectStatus @default(CREATED)
  overallProgress Int           @default(0)
  startDate       DateTime?
  targetEndDate   DateTime?
  completedAt     DateTime?
  deletedAt       DateTime?
  tags            Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  quote           Quote         @relation(fields: [quoteId], references: [id], onDelete: Restrict)
  client          User          @relation("ClientProjects", fields: [clientId], references: [id], onDelete: Restrict)
  admin           User?         @relation("AdminProjects", fields: [adminId], references: [id], onDelete: SetNull)
  milestones      Milestone[]
  payments        Payment[]
  messages        Message[]
  progressEntries ProgressEntry[]

  @@index([clientId])
  @@index([adminId])
  @@index([status])
}

model Milestone {
  id          String          @id @default(uuid(7))
  projectId   String
  name        String
  description String?
  amount      Int?
  percentage  Float?
  dueDate     DateTime?
  status      MilestoneStatus @default(PENDING)
  progress    Int             @default(0)
  order       Int             @default(0)
  startDate   DateTime?
  endDate     DateTime?
  completedAt DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  project     Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  deliverables Deliverable[]
  payments    Payment[]
  progressEntries ProgressEntry[]

  @@index([projectId])
  @@index([status])
}

model Deliverable {
  id          String            @id @default(uuid(7))
  milestoneId String
  name        String
  description String?
  status      DeliverableStatus @default(PENDING)
  priority    String?
  tags        Json?
  attachments Json?
  dueAt       DateTime?
  approvedAt  DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  milestone   Milestone         @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  progressEntries ProgressEntry[]

  @@index([milestoneId])
  @@index([status])
}

model ProgressEntry {
  id            String       @id @default(uuid(7))
  projectId     String
  milestoneId   String?
  deliverableId String?
  type          String
  title         String
  description   String?
  actorId       String?
  details       Json?
  visibility    String       @default("client")
  clientNotified Boolean     @default(false)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  project       Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  milestone     Milestone?   @relation(fields: [milestoneId], references: [id], onDelete: SetNull)
  deliverable   Deliverable? @relation(fields: [deliverableId], references: [id], onDelete: SetNull)

  @@index([projectId])
}

// -----------------------------------------------------------------------------
// CORE DOMAIN: PAYMENTS
// -----------------------------------------------------------------------------

model Payment {
  id              String        @id @default(uuid(7))
  projectId       String
  milestoneId     String?
  clientId        String
  amount          Int
  currency        String        @default("INR")
  status          PaymentStatus @default(CREATED)
  method          String?
  intentId        String?       @unique
  externalId      String?
  externalStatus  String?
  providerDetails Json?
  refundStatus    String?
  amountRefunded  Int           @default(0)
  receiptNumber   String?
  receiptUrl      String?
  invoiceNumber   String?
  invoiceUrl      String?
  customNotes     String?
  paidAt          DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  project         Project       @relation(fields: [projectId], references: [id], onDelete: Restrict)
  milestone       Milestone?    @relation(fields: [milestoneId], references: [id], onDelete: SetNull)
  client          User          @relation(fields: [clientId], references: [id], onDelete: Restrict)
  refunds         Refund[]

  @@index([projectId])
  @@index([clientId])
  @@index([externalId])
  @@index([status])
}

model Refund {
  id              String        @id @default(uuid(7))
  paymentId       String
  amount          Int
  currency        String        @default("INR")
  type            String
  reason          String?
  status          String
  providerDetails Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  payment         Payment       @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@index([paymentId])
}

// -----------------------------------------------------------------------------
// CORE DOMAIN: MESSAGING & NOTIFICATIONS
// -----------------------------------------------------------------------------

model Message {
  id          String      @id @default(uuid(7))
  projectId   String
  senderId    String
  content     String?
  replyToId   String?
  type        MessageType @default(TEXT)
  readBy      Json?
  reactions   Json?
  editedAt    DateTime?
  deletedAt   DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sender      User        @relation(fields: [senderId], references: [id], onDelete: Cascade)
  replyTo     Message?    @relation("ThreadReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies     Message[]   @relation("ThreadReplies")

  @@index([projectId])
  @@index([createdAt])
}

model Notification {
  id          String               @id @default(uuid(7))
  userId      String
  type        String
  title       String
  message     String
  priority    NotificationPriority @default(NORMAL)
  data        Json?
  actionUrl   String?
  read        Boolean              @default(false)
  readAt      DateTime?
  channels    Json?
  expiresAt   DateTime?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  user        User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([read])
}

// -----------------------------------------------------------------------------
// CORE DOMAIN: MEDIA
// -----------------------------------------------------------------------------

model Media {
  id               String          @id @default(uuid(7))
  filename         String
  originalFilename String
  mimeType         String
  size             Int
  status           MediaStatus     @default(PENDING)
  visibility       MediaVisibility @default(PRIVATE)
  uploaderId       String
  contextType      String?
  contextId        String?
  urls             Json?
  metadata         Json?
  deletedAt        DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  uploader         User            @relation(fields: [uploaderId], references: [id], onDelete: Restrict)

  @@index([uploaderId])
  @@index([contextType, contextId])
}

// -----------------------------------------------------------------------------
// CORE DOMAIN: PORTFOLIO & BLOG
// -----------------------------------------------------------------------------

model PortfolioItem {
  id               String          @id @default(uuid(7))
  slug             String          @unique
  title            String
  shortDescription String
  fullDescription  String
  contentFormat    String          @default("markdown")
  categoryId       String
  status           PortfolioStatus @default(DRAFT)
  featured         Boolean         @default(false)
  clientName       String?
  clientLogo       String?
  clientIndustry   String?
  clientWebsite    String?
  clientTestimonial Json?
  stats            Json?
  thumbnailId      String?
  videoId          String?
  tags             Json?
  projectDetails   Json?
  links            Json?
  seo              Json?
  publishedAt      DateTime?
  completedAt      DateTime?
  deletedAt        DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  category         PortfolioCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@index([status])
  @@index([categoryId])
}

model PortfolioCategory {
  id        String          @id @default(uuid(7))
  name      String
  slug      String          @unique
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  items     PortfolioItem[]
}

model BlogPost {
  id              String        @id @default(uuid(7))
  slug            String        @unique
  title           String
  excerpt         String
  content         String
  contentFormat   String        @default("markdown")
  authorId        String
  categoryId      String
  status          BlogStatus    @default(DRAFT)
  commentsEnabled Boolean       @default(true)
  featuredImageId String?
  seo             Json?
  seriesId        String?
  seriesPosition  Int?
  publishedAt     DateTime?
  deletedAt       DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  author          User          @relation(fields: [authorId], references: [id], onDelete: Restrict)
  category        BlogCategory  @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  series          BlogSeries?   @relation(fields: [seriesId], references: [id], onDelete: SetNull)
  tags            BlogTag[]     @relation("BlogPostTags")
  comments        BlogComment[]

  @@index([status])
  @@index([authorId])
  @@index([categoryId])
}

model BlogSeries {
  id          String     @id @default(uuid(7))
  slug        String     @unique
  name        String
  description String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  posts       BlogPost[]
}

model BlogCategory {
  id          String     @id @default(uuid(7))
  name        String
  slug        String     @unique
  description String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  posts       BlogPost[]
}

model BlogTag {
  id        String     @id @default(uuid(7))
  name      String
  slug      String     @unique
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  posts     BlogPost[] @relation("BlogPostTags")
}

model BlogComment {
  id                String        @id @default(uuid(7))
  postId            String
  authorId          String
  content           String
  parentId          String?
  status            CommentStatus @default(PENDING)
  likes             Int           @default(0)
  isPinned          Boolean       @default(false)
  moderationMessage String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  post              BlogPost      @relation(fields: [postId], references: [id], onDelete: Cascade)
  author            User          @relation(fields: [authorId], references: [id], onDelete: Cascade)
  parent            BlogComment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: SetNull)
  replies           BlogComment[] @relation("CommentReplies")

  @@index([postId])
  @@index([status])
  @@index([authorId])
  @@index([parentId])
}

// -----------------------------------------------------------------------------
// CORE DOMAIN: SYSTEM & CONTACT
// -----------------------------------------------------------------------------

model ContactMessage {
  id        String         @id @default(uuid(7))
  ticketId  String         @unique
  name      String
  email     String
  subject   ContactSubject @default(GENERAL)
  message   String
  status    ContactStatus  @default(NEW)
  ipInfo    Json?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  @@index([status])
  @@index([createdAt])
  @@index([ticketId])
  @@index([email])
}

model SystemConfig {
  id          String   @id @default(uuid(7))
  key         String   @unique
  value       Json
  description String?
  isPublic    Boolean  @default(false)
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  admin       User?    @relation(fields: [updatedBy], references: [id], onDelete: SetNull)

  @@index([key])
}

model EmailTemplate {
  id          String   @id @default(uuid(7))
  name        String   @unique
  subject     String
  body        String
  variables   Json?
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
}

// -----------------------------------------------------------------------------
// CORE ARCHITECTURE: OUTBOX, WEBHOOKS, AUDIT, IDEMPOTENCY
// -----------------------------------------------------------------------------

model OutboxEvent {
  id            String       @id @default(uuid(7))
  type          String
  aggregateType String
  aggregateId   String
  payload       Json
  status        OutboxStatus @default(PENDING)
  error         String?
  retries       Int          @default(0)
  createdAt     DateTime     @default(now())
  publishedAt   DateTime?

  @@index([status])
  @@index([aggregateType, aggregateId])
}

model Webhook {
  id          String            @id @default(uuid(7))
  name        String
  url         String
  secret      String
  enabled     Boolean           @default(true)
  events      Json
  retryPolicy Json?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  deliveries  WebhookDelivery[]
}

model WebhookDelivery {
  id              String   @id @default(uuid(7))
  webhookId       String
  event           String
  payload         Json
  status          String
  statusCode      Int?
  requestHeaders  Json?
  responseHeaders Json?
  responseBody    String?
  createdAt       DateTime @default(now())

  webhook         Webhook  @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  @@index([webhookId])
}

model WebhookLog {
  id          String                 @id @default(uuid(7))
  provider    String
  eventId     String?
  eventType   String
  payload     Json
  status      WebhookIngestionStatus @default(PENDING)
  error       String?
  processedAt DateTime?
  createdAt   DateTime               @default(now())
  updatedAt   DateTime               @updatedAt

  @@index([status])
  @@index([provider, eventId])
}

model AuditLog {
  id           String   @id @default(uuid(7))
  userId       String?
  action       String
  category     String
  description  String
  resourceType String?
  resourceId   String?
  metadata     Json?
  ip           String?
  userAgent    String?
  createdAt    DateTime @default(now())

  user         User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([createdAt])
  @@index([resourceType, resourceId])
}

model IdempotencyKey {
  id           String    @id @default(uuid(7))
  key          String    @unique
  path         String
  method       String
  requestHash  String?
  responseCode Int?
  responseBody Json?
  lockedAt     DateTime?
  expiresAt    DateTime
  createdAt    DateTime  @default(now())

  @@index([expiresAt])
}
```

---

## 3. Key Relationships

- **Users, Requests, Quotes, and Projects**: A user initiates a `ProjectRequest`. Once approved, a `Quote` is sent. When the quote is accepted, it is converted into a `Project`, establishing a strict pipeline (`User 1:N Request 1:1 Quote 1:1 Project`).
- **Project Structure**: Projects branch out into `Milestone`s and `Deliverable`s (1:N), allowing granular tracking. `Payment`s are strongly tied to projects and optionally specific milestones.
- **Media and Multi-Contexts**: The `Media` model uses `contextType` and `contextId` for flexible connections to messages, deliverables, and blog posts without rigid foreign keys, easing the public/private bucket architecture sync processes.
- **Blog Architecture**: A `BlogPost` links deeply with a `BlogCategory`, multiple `BlogTag`s (via M:N relation implicitly handled by Prisma as `_BlogPostTags`), and an author `User`. Hierarchical threaded `BlogComment`s are modeled using a self-referencing relationship (`parentId`).

---

## 4. Indexes & Performance

- **Lookup Hotpaths**: High-traffic lookups (e.g., `email`, `token`, `slug`, `key`) are uniquely indexed to ensure rapid login checks, token validations, and idempotency lock acquisition.
- **Filtering & List Views**: State-tracking fields (`status`) and relational groupings (`userId`, `projectId`, `categoryId`) are indexed to optimize dashboard table lists and admin filters.
- **Asynchronous Integrity**:
  - `OutboxEvent` has an index on `[status]` for the Poller Worker to quickly fetch un-published events.
  - `WebhookLog` has an index on `[status]` to optimize the Ingestion Worker queue.
  - `AuditLog` leverages `[createdAt]` and `[resourceType, resourceId]` for fast historical tracking and security timeline generation.
