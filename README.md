# EduRPG - Školní gamifikační platforma

EduRPG je moderní gamifikační platforma pro vzdělávání, která transformuje tradiční školní prostředí v RPG zážitek. Studenti získávají XP, plní úkoly, sbírají úspěchy a stoupají v úrovních.

## 🎮 Funkce

- **Úkoly a mise** - Učitelé vytvářejí zajímavé úkoly s XP a peněžními odměnami
- **XP ekonomika** - Systém zkušeností s denními rozpočty pro učitele
- **Úspěchy a odznaky** - Odemykání úspěchů za různé výkony
- **Obchod s předměty** - Kosmetické předměty a boosty
- **Role-based přístup** - Studenti, učitelé a operátoři
- **Bakaláři integrace** - Synchronizace s existujícím školním systémem
- **RPG UI** - Moderní, responzivní design s gamifikačními prvky

## 🏗️ Architektura

### Technologie
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: TailwindCSS + shadcn/ui
- **Autentifikace**: NextAuth v4 s JWT
- **Databáze**: PostgreSQL 16 + Prisma ORM
- **Validace**: Zod
- **Styling**: TailwindCSS s RPG tématem

### Struktura projektu
```
EduRPG/
├── app/
│   ├── (app)/dashboard/     # Role-aware dashboards
│   ├── api/                 # API routes
│   ├── components/          # UI components
│   ├── lib/                 # Core utilities
│   │   ├── services/        # Domain services
│   │   ├── auth.ts          # NextAuth config
│   │   ├── rbac.ts          # Role-based access control
│   │   └── utils.ts         # Utility functions
│   └── globals.css          # Global styles
├── prisma/                  # Database schema
├── docs/                    # Documentation
└── ops/                     # Operations scripts
```

## 🚀 Rychlý start

### Předpoklady
- Node.js 18+
- Docker a Docker Compose
- PostgreSQL 16

### Instalace

1. **Klonujte repozitář**
```bash
git clone <repository-url>
cd EduRPG
```

2. **Nastavte prostředí**
```bash
cp env.example .env.local
# Upravte .env.local s vašimi hodnotami
```

3. **Spusťte databázi**
```bash
docker-compose up -d postgres
```

4. **Nainstalujte závislosti**
```bash
npm install
```

5. **Nastavte databázi**
```bash
npx prisma generate
npx prisma migrate dev
```

6. **Spusťte vývojový server**
```bash
npm run dev
```

Aplikace bude dostupná na `http://localhost:3000`

## 🔧 Konfigurace

### Environment proměnné

Vytvořte `.env.local` soubor s následujícími proměnnými:

```env
# Database
DATABASE_URL="postgresql://edurpg_user:edurpg_password@localhost:5432/edurpg"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Bakaláři Integration (volitelné)
BAKALARI_API_URL="https://api.bakalari.cz"
BAKALARI_CLIENT_ID="your-client-id"
BAKALARI_CLIENT_SECRET="your-client-secret"
```

### Databáze

Pro lokální vývoj použijte Docker Compose:

```bash
# Spustit databázi
docker-compose up -d postgres

# Zobrazit logy
docker-compose logs postgres

# Zastavit
docker-compose down
```

## 👥 Role a oprávnění

### Student
- Prohlížení dostupných úkolů
- Přihlašování na úkoly
- Sledování XP a úrovní
- Nákup předmětů v obchodě

### Učitel
- Vytváření a správa úkolů
- Schvalování přihlášek studentů
- Udělování XP (s denním rozpočtem)
- Sledování pokroku studentů

### Operátor
- Správa celého systému
- Synchronizace s Bakaláři
- Správa uživatelů a tříd
- Systémové nastavení

## 🎯 Domény

### Jobs (Úkoly)
- Vytváření úkolů s XP a peněžními odměnami
- Přihlašování studentů na úkoly
- Schvalování a dokončování úkolů
- Automatické rozdělování odměn

### XP Economy
- Denní rozpočty pro učitele
- Idempotentní udělování XP
- Sledování historie XP
- Výpočet úrovní

### Achievements
- Manuální udělování úspěchů
- Sledování odemčených úspěchů
- Badge systém

### Shop & Items
- Kosmetické předměty
- Rarity systém (Common, Uncommon, Rare, Epic, Legendary)
- Nákup a vlastnictví předmětů

## 🔒 Bezpečnost

- JWT-based autentifikace
- Role-based access control (RBAC)
- Validace vstupů pomocí Zod
- PII-free logování
- Transakční integrita pro kritické operace

## 📊 Monitoring a Logs

- Systémové logy bez PII
- Request ID propagation
- Health check endpoint (`/api/health`)
- Automatické zálohy (22:00 denně)

## 🧪 Vývoj

### Dostupné skripty

```bash
# Vývoj
npm run dev          # Spustit vývojový server
npm run build        # Build pro produkci
npm run start        # Spustit produkční server

# Databáze
npm run prisma:generate  # Generovat Prisma client
npm run prisma:migrate   # Spustit migrace
npm run prisma:studio    # Otevřít Prisma Studio

# Linting
npm run lint         # ESLint kontrola
```

### Konvence kódu

- **TypeScript strict mode** - Žádné `any` typy
- **Server Components** pro data fetching
- **Client Components** pro interaktivitu
- **Zod validace** na API hranicích
- **Prisma transakce** pro kritické operace

### Testování

```bash
# Unit testy
npm run test

# E2E testy
npm run test:e2e
```

## 🚀 Nasazení

### Produkční build

```bash
npm run build
npm run start
```

### Docker nasazení

```bash
# Build image
docker build -t edurpg .

# Spustit container
docker run -p 3000:3000 edurpg
```

## 📚 Dokumentace

- [Architektura](./docs/ARCHITECTURE.md)
- [API Specifikace](./docs/API_SPEC.md)
- [Technologie](./docs/TECHNOLOGY.md)
- [Úkoly](./docs/TASKS.md)

## 🤝 Přispívání

1. Fork repozitáře
2. Vytvořte feature branch (`git checkout -b feature/amazing-feature`)
3. Commit změny (`git commit -m 'Add amazing feature'`)
4. Push do branch (`git push origin feature/amazing-feature`)
5. Otevřete Pull Request

## 📄 Licence

Tento projekt je licencován pod MIT licencí - viz [LICENSE](LICENSE) soubor pro detaily.

## 🆘 Podpora

Pro podporu a otázky:
- Otevřete Issue na GitHubu
- Kontaktujte vývojový tým
- Viz dokumentace v `/docs` složce

---

**EduRPG** - Transformujte vzdělávání pomocí gamifikace! 🎮📚
