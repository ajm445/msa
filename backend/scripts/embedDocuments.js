#!/usr/bin/env node
/**
 * 문서 임베딩 스크립트
 *
 * Markdown 문서를 처리하여 임베딩 벡터를 생성하고 Supabase에 저장합니다.
 *
 * 사용법:
 *   node scripts/embedDocuments.js <문서경로>
 *   node scripts/embedDocuments.js ../docs/MSA_정의서.md
 *   node scripts/embedDocuments.js --all  # docs 폴더의 모든 .md 파일 처리
 *   node scripts/embedDocuments.js --list # 저장된 문서 목록 조회
 *   node scripts/embedDocuments.js --delete <documentId> # 문서 삭제
 */

import { processDocument, listDocuments, deleteDocument } from '../src/services/ragService.js';
import { isVoyageConfigured } from '../src/lib/voyage.js';
import { supabase } from '../src/lib/supabase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 색상 출력을 위한 헬퍼
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

/**
 * 단일 문서 처리
 * @param {string} filePath - 파일 경로
 * @param {string} documentName - 문서 이름 (옵션, 하위 폴더 포함 가능)
 */
async function processFile(filePath, documentName = null) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  // 파일 존재 확인
  try {
    await fs.access(absolutePath);
  } catch {
    log(colors.red, `❌ 파일을 찾을 수 없습니다: ${absolutePath}`);
    return null;
  }

  // .md 파일인지 확인
  if (!absolutePath.endsWith('.md')) {
    log(colors.yellow, `⚠️  Markdown 파일만 처리할 수 있습니다: ${absolutePath}`);
    return null;
  }

  const displayName = documentName || path.basename(absolutePath);

  try {
    log(colors.cyan, `\n📄 처리 중: ${displayName}`);
    const result = await processDocument(absolutePath, { documentName: displayName });
    log(colors.green, `✅ 완료: ${result.documentId} (${result.totalChunks}개 청크)`);
    return result;
  } catch (error) {
    log(colors.red, `❌ 처리 실패: ${error.message}`);
    return null;
  }
}

/**
 * 지정된 시간(ms) 동안 대기
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 디렉토리를 재귀적으로 탐색하여 모든 .md 파일 찾기
 */
async function findMarkdownFiles(dir, baseDir = dir) {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subResults = await findMarkdownFiles(fullPath, baseDir);
      results.push(...subResults);
    } else if (entry.name.endsWith('.md')) {
      // 상대 경로로 저장 (baseDir 기준)
      const relativePath = path.relative(baseDir, fullPath);
      results.push({ name: relativePath, path: fullPath });
    }
  }

  return results;
}

/**
 * docs 폴더의 모든 문서 처리 (하위 폴더 포함)
 */
async function processAllDocs() {
  const docsPath = path.resolve(__dirname, '../../docs');
  const DOCUMENT_DELAY = 25000; // 25초 (문서 간 대기)

  try {
    const mdFileInfos = await findMarkdownFiles(docsPath);
    const mdFiles = mdFileInfos.map(f => f.name);

    // 이미 처리된 문서 확인
    const existingDocs = await listDocuments();
    const existingNames = new Set(existingDocs.map(d => d.name));

    const filesToProcess = mdFileInfos.filter(f => !existingNames.has(f.name));
    const skipped = mdFileInfos.filter(f => existingNames.has(f.name));

    log(colors.blue, `\n📁 ${mdFiles.length}개의 Markdown 파일 발견`);
    if (skipped.length > 0) {
      log(colors.yellow, `⏭️  이미 처리된 문서 ${skipped.length}개 건너뜀: ${skipped.map(f => f.name).join(', ')}`);
    }

    if (filesToProcess.length === 0) {
      log(colors.green, `\n✅ 모든 문서가 이미 처리되었습니다.`);
      return [];
    }

    log(colors.cyan, `📝 처리할 문서: ${filesToProcess.length}개`);
    log(colors.yellow, `⏱️  Rate Limit으로 인해 시간이 소요됩니다.\n`);

    const results = [];
    const failed = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const fileInfo = filesToProcess[i];
      const filePath = fileInfo.path;

      log(colors.blue, `\n[${i + 1}/${filesToProcess.length}] 처리 시작...`);
      const result = await processFile(filePath, fileInfo.name);

      if (result) {
        results.push(result);
      } else {
        failed.push(fileInfo.name);
      }

      // 다음 문서 전 대기 (마지막 문서 제외)
      if (i < filesToProcess.length - 1) {
        log(colors.yellow, `\n⏳ 다음 문서까지 ${DOCUMENT_DELAY / 1000}초 대기...`);
        await sleep(DOCUMENT_DELAY);
      }
    }

    log(colors.green, `\n${'═'.repeat(50)}`);
    log(colors.green, `✅ 총 ${results.length}/${filesToProcess.length}개 문서 처리 완료`);
    if (failed.length > 0) {
      log(colors.red, `❌ 실패: ${failed.join(', ')}`);
    }
    log(colors.green, `${'═'.repeat(50)}`);

    return results;
  } catch (error) {
    log(colors.red, `❌ docs 폴더 읽기 실패: ${error.message}`);
    return [];
  }
}

/**
 * 특정 폴더의 문서만 처리
 * @param {string} folderName - docs 하위 폴더 이름 (예: msa-guides)
 */
async function processFolder(folderName) {
  const docsPath = path.resolve(__dirname, '../../docs');
  const targetPath = path.join(docsPath, folderName);
  const DOCUMENT_DELAY = 25000; // 25초 (문서 간 대기)

  try {
    // 폴더 존재 확인
    await fs.access(targetPath);
  } catch {
    log(colors.red, `❌ 폴더를 찾을 수 없습니다: ${targetPath}`);
    return [];
  }

  try {
    const mdFileInfos = await findMarkdownFiles(targetPath, docsPath);
    const mdFiles = mdFileInfos.map(f => f.name);

    // 이미 처리된 문서 확인
    const existingDocs = await listDocuments();
    const existingNames = new Set(existingDocs.map(d => d.name));

    const filesToProcess = mdFileInfos.filter(f => !existingNames.has(f.name));
    const skipped = mdFileInfos.filter(f => existingNames.has(f.name));

    log(colors.blue, `\n📁 ${folderName}/ 폴더에서 ${mdFiles.length}개의 Markdown 파일 발견`);
    if (skipped.length > 0) {
      log(colors.yellow, `⏭️  이미 처리된 문서 ${skipped.length}개 건너뜀: ${skipped.map(f => f.name).join(', ')}`);
    }

    if (filesToProcess.length === 0) {
      log(colors.green, `\n✅ 모든 문서가 이미 처리되었습니다.`);
      return [];
    }

    log(colors.cyan, `📝 처리할 문서: ${filesToProcess.length}개`);
    log(colors.yellow, `⏱️  Rate Limit으로 인해 시간이 소요됩니다.\n`);

    const results = [];
    const failed = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const fileInfo = filesToProcess[i];
      const filePath = fileInfo.path;

      log(colors.blue, `\n[${i + 1}/${filesToProcess.length}] 처리 시작...`);
      const result = await processFile(filePath, fileInfo.name);

      if (result) {
        results.push(result);
      } else {
        failed.push(fileInfo.name);
      }

      // 다음 문서 전 대기 (마지막 문서 제외)
      if (i < filesToProcess.length - 1) {
        log(colors.yellow, `\n⏳ 다음 문서까지 ${DOCUMENT_DELAY / 1000}초 대기...`);
        await sleep(DOCUMENT_DELAY);
      }
    }

    log(colors.green, `\n${'═'.repeat(50)}`);
    log(colors.green, `✅ 총 ${results.length}/${filesToProcess.length}개 문서 처리 완료`);
    if (failed.length > 0) {
      log(colors.red, `❌ 실패: ${failed.join(', ')}`);
    }
    log(colors.green, `${'═'.repeat(50)}`);

    return results;
  } catch (error) {
    log(colors.red, `❌ 폴더 처리 실패: ${error.message}`);
    return [];
  }
}

/**
 * 저장된 문서 목록 출력
 */
async function showDocumentList() {
  try {
    const documents = await listDocuments();

    if (documents.length === 0) {
      log(colors.yellow, '\n📭 저장된 문서가 없습니다.');
      return;
    }

    log(colors.blue, `\n📚 저장된 문서 목록 (${documents.length}개)\n`);
    console.log('─'.repeat(80));
    console.log(
      '  ID'.padEnd(35),
      '이름'.padEnd(25),
      '청크'.padEnd(8),
      '생성일'
    );
    console.log('─'.repeat(80));

    for (const doc of documents) {
      console.log(
        `  ${doc.id}`.padEnd(35),
        doc.name.substring(0, 20).padEnd(25),
        `${doc.total_chunks}개`.padEnd(8),
        new Date(doc.created_at).toLocaleDateString('ko-KR')
      );
    }
    console.log('─'.repeat(80));
  } catch (error) {
    log(colors.red, `❌ 문서 목록 조회 실패: ${error.message}`);
  }
}

/**
 * 문서 삭제
 */
async function deleteDoc(documentId) {
  try {
    await deleteDocument(documentId);
    log(colors.green, `✅ 문서 삭제 완료: ${documentId}`);
  } catch (error) {
    log(colors.red, `❌ 문서 삭제 실패: ${error.message}`);
  }
}

/**
 * 사용법 출력
 */
function showUsage() {
  console.log(`
📖 문서 임베딩 스크립트 사용법

  처리:
    node scripts/embedDocuments.js <문서경로>
    node scripts/embedDocuments.js ../docs/MSA_정의서.md
    node scripts/embedDocuments.js --all            # docs 폴더 전체 처리 (하위 폴더 포함)
    node scripts/embedDocuments.js --folder <이름>  # docs 하위 특정 폴더만 처리

  관리:
    node scripts/embedDocuments.js --list           # 저장된 문서 목록
    node scripts/embedDocuments.js --delete <id>    # 문서 삭제

  예시:
    node scripts/embedDocuments.js ../docs/MSA_정의서.md
    node scripts/embedDocuments.js --folder msa-guides  # msa-guides 폴더만 처리
    node scripts/embedDocuments.js --list
    node scripts/embedDocuments.js --delete doc_MSA_정의서_abc123
`);
}

/**
 * 메인 함수
 */
async function main() {
  const args = process.argv.slice(2);

  log(colors.cyan, '\n🔮 문서 임베딩 스크립트\n');

  // 환경 확인
  if (!isVoyageConfigured()) {
    log(colors.red, '❌ Voyage AI가 설정되지 않았습니다.');
    log(colors.yellow, '   .env 파일에 VOYAGE_API_KEY를 설정해주세요.');
    process.exit(1);
  }

  if (!supabase) {
    log(colors.red, '❌ Supabase가 설정되지 않았습니다.');
    log(colors.yellow, '   .env 파일에 SUPABASE_URL과 SUPABASE_ANON_KEY를 설정해주세요.');
    process.exit(1);
  }

  log(colors.green, '✓ Voyage AI 연결됨');
  log(colors.green, '✓ Supabase 연결됨');

  // 인자 처리
  if (args.length === 0) {
    showUsage();
    process.exit(0);
  }

  const command = args[0];

  if (command === '--help' || command === '-h') {
    showUsage();
    process.exit(0);
  }

  if (command === '--list' || command === '-l') {
    await showDocumentList();
    process.exit(0);
  }

  if (command === '--delete' || command === '-d') {
    if (!args[1]) {
      log(colors.red, '❌ 삭제할 문서 ID를 지정해주세요.');
      process.exit(1);
    }
    await deleteDoc(args[1]);
    process.exit(0);
  }

  if (command === '--all' || command === '-a') {
    await processAllDocs();
    process.exit(0);
  }

  if (command === '--folder' || command === '-f') {
    if (!args[1]) {
      log(colors.red, '❌ 처리할 폴더 경로를 지정해주세요.');
      log(colors.yellow, '   예: node scripts/embedDocuments.js --folder msa-guides');
      process.exit(1);
    }
    await processFolder(args[1]);
    process.exit(0);
  }

  // 단일 파일 처리
  await processFile(command);
  process.exit(0);
}

main().catch(error => {
  log(colors.red, `❌ 오류 발생: ${error.message}`);
  process.exit(1);
});
