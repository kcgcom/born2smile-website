const lines = [
  "pnpm deploy는 차단되어 있으며 실제 배포를 실행하지 않습니다.",
  "운영 배포는 승인된 main 반영(push 또는 merge)에 따른 GitHub → Vercel 자동 배포만 사용하세요.",
];

for (const line of lines) {
  console.error(line);
}

process.exit(1);
