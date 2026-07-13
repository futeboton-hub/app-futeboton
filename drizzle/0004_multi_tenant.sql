-- ========== CRIAR TABELA DE TENANTS ==========
CREATE TABLE `tenants` (
  `id` int AUTO_INCREMENT NOT NULL,
  `slug` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `logoUrl` text,
  `primaryColor` varchar(20) NOT NULL DEFAULT '#1a73e8',
  `isActive` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
  CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);

-- ========== CRIAR TABELA DE MEMBERSHIPS ==========
CREATE TABLE `memberships` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('admin', 'member') NOT NULL DEFAULT 'member',
  `invitedBy` int,
  `joinedAt` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `memberships_id` PRIMARY KEY(`id`),
  CONSTRAINT `memberships_tenant_user_unique` UNIQUE(`tenantId`, `userId`)
);

-- ========== ADICIONAR tenantId NAS TABELAS EXISTENTES ==========
ALTER TABLE `tournaments` ADD `tenantId` int NOT NULL;
ALTER TABLE `registered_players` ADD `tenantId` int;
