# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - link "Zpět na hlavní stránku" [ref=e4]:
      - /url: /
      - img [ref=e5]
      - text: Zpět na hlavní stránku
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Přihlášení do EduRPG
        - generic [ref=e10]: Přihlaste se pomocí svých Bakaláři přihlašovacích údajů
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]:
            - generic [ref=e14]: Uživatelské jméno
            - textbox "Uživatelské jméno" [ref=e15]
          - generic [ref=e16]:
            - generic [ref=e17]: Heslo
            - textbox "Heslo" [ref=e18]
          - button "Přihlásit se" [ref=e19]
        - paragraph [ref=e21]:
          - text: Používáme Bakaláři API pro bezpečné přihlášení.
          - text: Vaše údaje se nikdy neukládají v naší databázi.
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e27] [cursor=pointer]:
    - img [ref=e28] [cursor=pointer]
  - alert [ref=e33]
```