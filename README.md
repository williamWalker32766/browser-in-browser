# Browser-in-Browser

A lightweight browser-style web app that runs inside your browser. It includes:

- Address bar and navigation controls
- Embedded browsing area using an iframe
- Quick bookmark panel
- Browsing history tracking
- Home screen with launch shortcuts
- Local persistence with `localStorage`

## Run locally

From the project folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Notes

- Some websites block iframe embedding for security reasons.
- This app is meant as a simple front-end browser shell and works best with sites that permit embedding.
- You can customize the default home page in `script.js`.

## Files

- `index.html` — app layout
- `styles.css` — visual design and responsive layout
- `script.js` — browser logic and saved state

## Future upgrades

- Tabs support
- Search engine switching
- Save custom bookmarks manually
- Dark/light theme toggle
- Download manager UI
- Better history and bookmark management
