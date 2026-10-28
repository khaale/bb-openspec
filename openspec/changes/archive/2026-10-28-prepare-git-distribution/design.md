## Context

bb builds a Git plugin after npm install --omit=dev --omit=optional --ignore-scripts. A working installation with devDependencies does not verify this contract. There is one plugin in the root; its ID is openspec and its version is 0.4.0.

## Decisions

- Check the production build in a temporary copy of the working files without node_modules, dist, or .git. Do not change the working installation or bb state.
- Pin the bb-app CLI for CI; CI contains no publication steps and requires no write permissions.
- Keep the Russian documentation and make the primary README English.
- Document Git release readiness criteria separately from a future Community submission. Fill in the repository address, account, tags, and catalog category at the appropriate stage.

## Risks / Trade-offs

Checking the production build requires network access for npm and the initial bb toolchain download. A marketplace submission will require checking the current schema and new wide screenshots; existing README images are not considered a complete submission set.
