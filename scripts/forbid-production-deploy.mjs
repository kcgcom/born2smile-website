const lines = [
  'Production deploy via CLI is blocked in this repository.',
  'Use Git-based deployment instead: push to main and let Vercel deploy automatically.',
  'If you need a manual non-production deployment, use `pnpm deploy:preview`.',
];

for (const line of lines) {
  console.error(line);
}

process.exit(1);
