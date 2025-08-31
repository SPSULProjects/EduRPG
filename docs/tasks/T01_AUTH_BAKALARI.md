**Owner:** FULLSTACK_INTEGRATOR

## Objective
Login via Bakaláři using NextAuth (Credentials). Minimal claims in JWT.

## Preconditions
- Next.js 15/React 19 app, Prisma wired, `src/lib/bakalari.ts` stub/impl.

## Steps
1. Create `src/lib/auth/bakalari.adapter.ts`:
   - `loginToBakalari(username, password) -> { accessToken }`
   - `getBakalariUserData(accessToken) -> { userID, userType, classId? }`
2. Configure NextAuth in `app/api/auth/[...nextauth]/route.ts`:
   - Map `userType` → role; store `role`, `classId`, `accessToken` in JWT.
   - Expose `role`, `classId` via session callback.
3. Build `/login` using shadcn `Form`/`Button`/`Toast`.
4. Add `/dashboard` showing session JSON.
5. Middleware redirects unauthenticated to `/login`.
6. Log `auth_success`/`auth_fail` in `SystemLog` with `requestId`.

## Edge Cases
- Invalid creds → error toast; no info leak.
- DataConnector timeout → friendly message; retry suggested.

## Acceptance
- Success ≤2s; session contains `role` + `classId`.

## Checklist
- [ ] Adapter
- [ ] Provider
- [ ] Login UI
- [ ] Dashboard
- [ ] Middleware
- [ ] Logs
