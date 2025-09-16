# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
      - img [ref=e8] [cursor=pointer]
    - generic [ref=e11] [cursor=pointer]:
      - button "Open issues overlay" [ref=e12] [cursor=pointer]:
        - generic [ref=e13] [cursor=pointer]:
          - generic [ref=e14] [cursor=pointer]: "0"
          - generic [ref=e15] [cursor=pointer]: "1"
        - generic [ref=e16] [cursor=pointer]: Issue
      - button "Collapse issues badge" [ref=e17] [cursor=pointer]:
        - img [ref=e18] [cursor=pointer]
  - generic [ref=e21]:
    - generic [ref=e22]:
      - generic [ref=e23]:
        - img [ref=e24]
        - generic [ref=e26]: Something went wrong
      - generic [ref=e27]: An unexpected error occurred. Please try refreshing the page.
    - generic [ref=e28]:
      - group [ref=e29]
      - generic [ref=e31]:
        - button "Try Again" [ref=e32]
        - button "Refresh Page" [ref=e33]
  - region "Notifications alt+T"
  - alert [ref=e34]
```