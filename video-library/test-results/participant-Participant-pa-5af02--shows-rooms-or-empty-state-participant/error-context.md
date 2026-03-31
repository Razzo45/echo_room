# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - img [ref=e6]
        - heading "Echo Room" [level=1] [ref=e8]
        - paragraph [ref=e9]: AI Powered Decision Environment
        - paragraph [ref=e10]: You don't leave with slides. You leave with a decision map.
      - generic [ref=e11]:
        - generic [ref=e13]:
          - generic [ref=e14]: Enter event code
          - textbox "Enter event code" [ref=e15]:
            - /placeholder: e.g. SMARTCITY26
            - text: SMARTCITY26
          - paragraph [ref=e17]: Invalid or inactive event code
          - button "Continue" [ref=e18] [cursor=pointer]
          - generic [ref=e19] [cursor=pointer]:
            - checkbox "Remember me (30 days)" [ref=e20]
            - generic [ref=e21]: Remember me (30 days)
        - paragraph [ref=e22]: Don't have a code? Contact your event organiser.
  - alert [ref=e23]
```