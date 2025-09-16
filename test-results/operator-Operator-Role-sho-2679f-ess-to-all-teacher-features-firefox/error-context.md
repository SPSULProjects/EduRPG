# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
      - img [ref=e8] [cursor=pointer]
    - generic [ref=e12] [cursor=pointer]:
      - button "Open issues overlay" [ref=e13] [cursor=pointer]:
        - generic [ref=e14] [cursor=pointer]:
          - generic [ref=e15] [cursor=pointer]: "1"
          - generic [ref=e16] [cursor=pointer]: "2"
        - generic [ref=e17] [cursor=pointer]:
          - text: Issue
          - generic [ref=e18] [cursor=pointer]: s
      - button "Collapse issues badge" [ref=e19] [cursor=pointer]:
        - img [ref=e20] [cursor=pointer]
  - generic [ref=e23]:
    - generic [ref=e24]:
      - generic [ref=e25]:
        - img [ref=e26]
        - generic [ref=e30]: Something went wrong
      - generic [ref=e31]: An unexpected error occurred. Please try refreshing the page.
    - generic [ref=e32]:
      - group [ref=e33]
      - generic [ref=e35]:
        - button "Try Again" [ref=e36]
        - button "Refresh Page" [ref=e37]
  - region "Notifications alt+T"
  - alert [ref=e38]
```