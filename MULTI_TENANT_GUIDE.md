# Guia de Implementação Multi-Tenant — Futeboton

## Visão Geral

O APP Futeboton foi adaptado para suportar **multi-tenant** (múltiplos espaços/sites), onde cada tenant representa um espaço independente com seus próprios torneios, jogadores, inscrições e partidas.

### Regra Principal: "Um Admin por Tenant"

Cada tenant possui **exatamente 1 administrador**. A criação de um segundo admin é bloqueada por validação de negócio em três camadas:
1. **Banco de dados**: função `countTenantAdmins()` verifica antes de inserir
2. **Middleware tRPC**: `tenantAdminProcedure` valida a role antes de executar
3. **Frontend**: UI exibe avisos visuais sobre a limitação

---

## Arquitetura

### Novas Tabelas no Banco de Dados

| Tabela | Descrição |
|---|---|
| `tenants` | Cada espaço/site separado. Campos: `slug`, `name`, `description`, `logoUrl`, `primaryColor`, `isActive` |
| `memberships` | Vínculo user ↔ tenant com `role` (admin/member). Restrição UNIQUE em `(tenantId, userId)` |

### Tabelas Modificadas

| Tabela | Alteração |
|---|---|
| `tournaments` | Adicionado `tenantId` (NOT NULL) |
| `registered_players` | Adicionado `tenantId` (nullable — jogadores podem ser globais ou por tenant) |

### Middlewares tRPC

| Procedure | Requisito |
|---|---|
| `publicProcedure` | Nenhuma — qualquer pessoa pode usar |
| `protectedProcedure` | Usuário autenticado |
| `adminProcedure` | Admin **global** (role="admin" em users) |
| `tenantProcedure` | Membro de um tenant específico (passa `tenantId` no input) |
| `tenantAdminProcedure` | Admin **do tenant** (role="admin" em memberships) |

---

## Rotas

### Públicas (sem tenant)

| Rota | Descrição |
|---|---|
| `/` | Seleção de tenant (lista todos os tenants ativos) |
| `/admin/tenants` | Gerenciamento de tenants (admin global) |

### Por Tenant

| Rota | Descrição |
|---|---|
| `/t/:slug` | Landing page do tenant (público) |
| `/t/:slug/tournaments` | Lista de torneios do tenant |
| `/admin/tenants/:tenantId/dashboard` | Painel admin do tenant |
| `/admin/tenants/:tenantId/tournaments` | CRUD de torneios do tenant |
| `/admin/tenants/:tenantId/members` | Gerenciamento de membros |
| `/admin/tenants/:tenantId/settings` | Configurações do tenant |

### Legacy (mantidas para compatibilidade)

| Rota | Descrição |
|---|---|
| `/legacy/home` | Página principal original |
| `/legacy/tournaments` | CRUD de torneios original |
| `/legacy/inscricao` | Inscrição pública original |
| `/legacy/admin/inscricoes` | Gestão de inscrições original |

---

## API REST Adicionadas

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/tenants` | GET | Lista todos os tenants ativos |
| `/api/tenant/:slug` | GET | Obtém tenant por slug |

---

## Como Usar

### 1. Criar um Tenant (Admin Global)

O admin global acessa `/admin/tenants` e clica em "Novo Tenant". Após criar, o tenant aparece na lista.

### 2. Adicionar Membros ao Tenant

O admin do tenant acessa `/admin/tenants/:tenantId/members` e clica em "Adicionar Membro".

**Ao tentar adicionar um segundo admin**, o sistema retorna o erro:
> "Este tenant já possui um administrador. Apenas 1 admin é permitido por tenant."

### 3. Criar Torneios (Admin do Tenant)

O admin do tenant acessa o dashboard `/admin/tenants/:tenantId/dashboard` e clica em "Novo Torneio". O torneio é criado automaticamente vinculado ao tenant.

### 4. Isolamento de Dados

Todas as queries de torneios, jogadores, partidas e inscrições são filtradas por `tenantId`. Um tenant **nunca** vê dados de outro tenant.

---

## Fluxo de Fluxo de Dados

```
Usuário entra no site
        │
        ▼
  / (TenantSelect)
  Lista tenants ativos
        │
        ▼
  /t/:slug (TenantLanding)
  Landing page do tenant
        │
        ├──► /t/:slug/tournaments (público)
        │
        └──► /admin/tenants/:tenantId/dashboard (autenticado)
                │
                ├──► /admin/tenants/:tenantId/tournaments
                ├──► /admin/tenants/:tenantId/members
                └──► /admin/tenants/:tenantId/settings
```

---

## Migração do Banco de Dados

Execute a migração `0004_multi_tenant.sql`:

```sql
-- Criar tabela tenants
CREATE TABLE `tenants` (...);

-- Criar tabela memberships
CREATE TABLE `memberships` (...);

-- Adicionar tenantId nas tabelas existentes
ALTER TABLE `tournaments` ADD `tenantId` int NOT NULL;
ALTER TABLE `registered_players` ADD `tenantId` int;
```

**Atenção**: A migração não preenche `tenantId` nos dados existentes. Você precisará:
1. Criar um tenant padrão
2. Associar o admin global como admin desse tenant
3. Atualizar os torneios existentes com o `tenantId` correto

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `drizzle/schema.ts` | Novas tabelas `tenants` e `memberships`, `tenantId` em torneios/jogadores |
| `drizzle/0004_multi_tenant.sql` | Nova migração |
| `drizzle/meta/_journal.json` | Registro da nova migração |
| `server/db.ts` | Funções CRUD de tenants, memberships, isolation queries |
| `server/_core/trpc.ts` | Middlewares `tenantProcedure` e `tenantAdminProcedure` |
| `server/_core/context.ts` | Campos `tenantId` e `tenantRole` no contexto |
| `server/_core/index.ts` | Rotas REST `/api/tenants` e `/api/tenant/:slug` |
| `server/_core/systemRouter.ts` | Rota `users` para listar usuários |
| `server/routers.ts` | Routers `tenants` e `memberships`, todas as queries adaptadas |
| `shared/const.ts` | Novas mensagens de erro para multi-tenant |
| `client/src/App.tsx` | Novas rotas para tenant selection e admin |
| `client/src/pages/TenantSelect.tsx` | Nova página — seleção de tenant |
| `client/src/pages/TenantLanding.tsx` | Nova página — landing do tenant |
| `client/src/pages/Tenants.tsx` | Nova página — gerenciamento de tenants (admin global) |
| `client/src/pages/TenantMembers.tsx` | Nova página — gerenciamento de membros |
| `client/src/pages/TournamentsByTenant.tsx` | Nova página — torneios por tenant |
| `client/src/pages/AdminDashboard.tsx` | Nova página — dashboard admin do tenant |
| `client/src/hooks/useTenant.ts` | Novo hook — resolução de tenant por URL |
