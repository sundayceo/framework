# @sundayceo/framework

A lightweight, React-based TypeScript framework for Cloudflare Workers. Pages ship zero JavaScript by default — only interactive slots hydrate.

- **Templates and slots** — pages declare which template to use and fill named slots. No nested layouts.
- **Automatic interactivity inference** — the compiler detects hooks, event handlers, and browser APIs per slot. Static slots ship no JS.
- **File-based routing** — routes map to files in `src/routes/`. Pages render HTML, handlers return raw responses.
- **Cloudflare-first** — built for Workers with zero Node.js dependencies, but ejectable to any Web Fetch API runtime.

## Documentation

**[framework.sundayceo.com](https://framework.sundayceo.com)**

## Quick start

```bash
npm create sundayceo@latest
```

## Packages

| Package                | npm                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `@sundayceo/framework` | [![npm](https://img.shields.io/npm/v/@sundayceo/framework)](https://www.npmjs.com/package/@sundayceo/framework) |
| `@sundayceo/create`    | [![npm](https://img.shields.io/npm/v/@sundayceo/create)](https://www.npmjs.com/package/@sundayceo/create)       |

## License

MIT
