# Setup (beginner friendly)

You need a Mac or PC with **Node.js 20 or newer**. Check with `node --version`.

## 1. Install

```bash
git clone https://github.com/hyeole/prompt-and-circumstance-challengex.git
cd prompt-and-circumstance-challengex
npm install
```

## 2. Configure the key (stop any screen recording first)

The Unissant key is a secret. It lives only in a local file named `.env.local`, which Git ignores.
Do not paste it into chat, code, screenshots, or documents.

Run this in Terminal from the project folder. It asks for the key without showing it on screen:

```bash
read -s "KEY?Paste key, then press Return: " && printf 'CHALLENGEX_API_KEY=%s\n' "$KEY" > .env.local && chmod 600 .env.local && unset KEY && echo && echo "Saved to .env.local"
```

(That command is for the macOS default shell, zsh. In bash, use `read -s -p "Paste key: " KEY` for the first part.)
Optional settings (timeout, retries) are listed in `.env.example`; the defaults work without them.

Check it worked without printing the key:

```bash
npm run check:api
```

You should see `Key found (length N, value hidden)` and `PASS` lines. If a step fails, the message shows the HTTP status, never the key.

## 3. Run the app

```bash
npm run dev
```

Open http://localhost:3000. Pick a case, then click **Run review**.

## 4. Tests and evaluation

```bash
npm test          # unit tests, no key needed
npm run eval      # live evaluation against team test cases (needs the key)
```

## If the key leaks

If the key ever appears in a commit, screenshot, or recording: stop, do not push, tell the team, ask Unissant to revoke and reissue it, and clean the Git history before publishing.
