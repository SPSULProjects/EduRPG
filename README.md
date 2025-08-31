# EduRPG - Školní gamifikační platforma

RPG-stylovaná platforma pro gamifikaci vzdělávání s úkoly, XP, úspěchy a obchodem.

## 🚀 Features

- **Role-based Access Control**: STUDENT, TEACHER, OPERATOR roles
- **Job System**: Teachers create tasks, students apply and complete them
- **XP Economy**: Experience points and level progression
- **Achievement System**: Badges and achievements for motivation
- **Shop System**: Virtual currency and item purchases
- **Bakaláři Integration**: School management system integration (planned)

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Validation**: Zod

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

## 🔧 Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd edurpg
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following environment variables:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/edurpg"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Database setup**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🔒 Security Notes

### ⚠️ Important Security Considerations

1. **Authentication**: Currently using development-only authentication
   - Production requires Bakaláři DataConnector integration
   - Never deploy with mock authentication in production

2. **Environment Variables**: 
   - Keep `.env.local` secure and never commit to version control
   - Use strong, unique secrets for production

3. **Database Security**:
   - Use connection pooling in production
   - Implement proper backup strategies
   - Regular security updates

4. **API Security**:
   - All endpoints require authentication
   - Role-based access control implemented
   - Input validation with Zod schemas

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
```

### Code Quality

- **ESLint**: Configured with Next.js and TypeScript rules
- **TypeScript**: Strict type checking enabled
- **Prettier**: Code formatting (recommended)

### Database Schema

The application uses Prisma with the following main entities:
- `User`: Students, teachers, and operators
- `Job`: Tasks created by teachers
- `JobAssignment`: Student applications for jobs
- `XPAudit`: Experience point transactions
- `MoneyTx`: Virtual currency transactions
- `Achievement`: Badges and achievements

## 🚨 Critical TODOs Before Production

1. **Authentication**: Implement Bakaláři DataConnector integration
2. **Testing**: Add comprehensive test suite
3. **Monitoring**: Implement application monitoring and logging
4. **Performance**: Add caching and database optimization
5. **Security Audit**: Conduct thorough security review

## 📁 Project Structure

```
app/
├── (app)/              # App router pages
│   └── dashboard/      # Dashboard pages
├── api/                # API routes
│   ├── auth/           # Authentication endpoints
│   ├── jobs/           # Job management endpoints
│   └── xp/             # XP system endpoints
├── components/         # React components
│   ├── ui/             # Reusable UI components
│   └── dashboard/      # Dashboard-specific components
├── lib/                # Utility libraries
│   ├── generated/      # Prisma generated client
│   ├── services/       # Business logic services
│   └── utils.ts        # Utility functions
└── prisma/             # Database schema and migrations
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team.

---

**⚠️ Warning**: This application is currently in development. Do not use in production without implementing proper authentication and security measures.
