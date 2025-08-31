# EduRPG Starter

Run:
```bash
npm install
cp .env.example .env.local
docker compose up -d db
npx prisma migrate dev --name init
npm run dev
```
