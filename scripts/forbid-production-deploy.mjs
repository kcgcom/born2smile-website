const lines = [
  "이 저장소에서는 CLI를 통한 프로덕션 배포를 차단합니다.",
  "프로덕션은 승인된 main push에 따른 GitHub → Vercel 자동 배포만 사용하세요.",
];

for (const line of lines) {
  console.error(line);
}

process.exit(1);
