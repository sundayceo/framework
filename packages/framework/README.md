# @sundayceo/framework

A lightweight, React-based TypeScript framework for Cloudflare Workers with selective hydration.

Pages ship zero JavaScript by default — only interactive slots hydrate.

## Features

- **Templates and slots** — pages declare which template to use and fill named slots
- **Automatic interactivity inference** — the compiler detects hooks, event handlers, and browser APIs per slot
- **File-based routing** — routes map to files in `src/routes/`
- **Cloudflare-first** — built for Workers with zero Node.js dependencies, ejectable to any Web Fetch API runtime

## Install

```bash
npm install @sundayceo/framework
```

## Quick start

```bash
npm create sundayceo@latest
```

## Documentation

**[framework.sundayceo.com](https://framework.sundayceo.com)**

## License

MIT
