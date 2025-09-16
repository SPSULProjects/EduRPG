# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - link "Zpět na hlavní stránku" [ref=e4] [cursor=pointer]:
      - /url: /
      - img [ref=e5] [cursor=pointer]
      - text: Zpět na hlavní stránku
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Přihlášení do EduRPG
        - generic [ref=e11]: Přihlaste se pomocí svých Bakaláři přihlašovacích údajů
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]:
            - generic [ref=e15]: Uživatelské jméno
            - textbox "Uživatelské jméno" [ref=e16]
          - generic [ref=e17]:
            - generic [ref=e18]: Heslo
            - textbox "Heslo" [ref=e19]
          - button "Přihlásit se" [ref=e20]
        - paragraph [ref=e22]:
          - text: Používáme Bakaláři API pro bezpečné přihlášení.
          - text: Vaše údaje se nikdy neukládají v naší databázi.
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e28] [cursor=pointer]:
    - img [ref=e29] [cursor=pointer]
  - alert [ref=e33]
```