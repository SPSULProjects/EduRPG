# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
      - img [ref=e8] [cursor=pointer]
    - generic [ref=e13] [cursor=pointer]:
      - button "Open issues overlay" [ref=e14] [cursor=pointer]:
        - generic [ref=e15] [cursor=pointer]:
          - generic [ref=e16] [cursor=pointer]: "1"
          - generic [ref=e17] [cursor=pointer]: "2"
        - generic [ref=e18] [cursor=pointer]:
          - text: Issue
          - generic [ref=e19] [cursor=pointer]: s
      - button "Collapse issues badge" [ref=e20] [cursor=pointer]:
        - img [ref=e21] [cursor=pointer]
  - generic [ref=e24]:
    - generic [ref=e25]:
      - generic [ref=e26]:
        - img [ref=e27]
        - generic [ref=e29]: Something went wrong
      - generic [ref=e30]: An unexpected error occurred. Please try refreshing the page.
    - generic [ref=e31]:
      - group [ref=e32]
      - generic [ref=e34]:
        - button "Try Again" [ref=e35]
        - button "Refresh Page" [ref=e36]
  - region "Notifications alt+T"
  - alert [ref=e37]
```