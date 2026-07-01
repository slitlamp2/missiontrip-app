#!/usr/bin/env node
/**
 * spain0511 공용 Firebase 규칙을 여행주권 프로젝트에 복사합니다.
 *
 * 사용법 (mongolia-mission-app 루트):
 *   npm run sync:firebase-rules
 *
 * 규칙 수정 후:
 *   1. mongolia-mission-app/firestore.rules · storage.rules 편집
 *   2. npm run sync:firebase-rules
 *   3. firebase deploy --only firestore:rules,storage
 *      (어느 앱 폴더에서 deploy해도 동일 — .firebaserc 모두 spain0511)
 */
import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TARGET = resolve(ROOT, '../yeohaeng-jugwon/yeohaeng-jugwon');

const FILES = ['firestore.rules', 'storage.rules'];

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(TARGET))) {
    console.error(`여행주권 경로를 찾을 수 없습니다: ${TARGET}`);
    console.error('Desktop/yeohaeng-jugwon/yeohaeng-jugwon 위치를 확인해 주세요.');
    process.exit(1);
  }

  for (const name of FILES) {
    const src = resolve(ROOT, name);
    const dest = resolve(TARGET, name);
    await copyFile(src, dest);
    console.log(`✔ ${name} → ${dest}`);
  }

  console.log('\n동기화 완료. 배포: firebase deploy --only firestore:rules,storage');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
