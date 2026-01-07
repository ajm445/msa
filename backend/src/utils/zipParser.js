import AdmZip from 'adm-zip';

/**
 * ZIP 파일에서 코드 구조 추출
 * @param {Buffer} zipBuffer - ZIP 파일 버퍼
 * @param {string} language - 언어/프레임워크
 * @returns {object} 코드 구조 정보
 */
export function extractCodeStructure(zipBuffer, language) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  const structure = {
    totalFiles: 0,
    analyzedFiles: 0,
    directories: [],
    files: [],
    codeFiles: [],
    configFiles: []
  };

  // 언어별 분석 대상 확장자
  const codeExtensions = {
    'java-spring': ['.java', '.xml', '.properties', '.yml', '.yaml'],
    'node-express': ['.js', '.ts', '.json', '.mjs'],
    'react': ['.jsx', '.tsx', '.js', '.ts', '.json']
  };

  const targetExtensions = codeExtensions[language] || ['.js', '.ts', '.java', '.py'];

  entries.forEach(entry => {
    if (entry.isDirectory) {
      structure.directories.push(entry.entryName);
    } else {
      structure.totalFiles++;
      structure.files.push(entry.entryName);

      const ext = '.' + entry.entryName.split('.').pop();

      // 코드 파일 분류
      if (targetExtensions.includes(ext)) {
        structure.analyzedFiles++;

        // 파일 내용 일부 추출 (최대 500자)
        try {
          const content = entry.getData().toString('utf8').substring(0, 500);
          structure.codeFiles.push({
            path: entry.entryName,
            extension: ext,
            preview: content
          });
        } catch {
          structure.codeFiles.push({
            path: entry.entryName,
            extension: ext,
            preview: '[읽기 실패]'
          });
        }
      }

      // 설정 파일 분류
      if (['.json', '.xml', '.yml', '.yaml', '.properties', '.env'].includes(ext) ||
          entry.entryName.includes('config') ||
          entry.entryName.includes('application')) {
        structure.configFiles.push(entry.entryName);
      }
    }
  });

  return structure;
}

/**
 * 코드 구조를 분석 프롬프트용 문자열로 변환
 * @param {object} structure - 코드 구조 정보
 * @returns {string} 프롬프트용 문자열
 */
export function formatCodeStructureForPrompt(structure) {
  let result = `## 파일 통계
- 전체 파일 수: ${structure.totalFiles}
- 분석 대상 파일 수: ${structure.analyzedFiles}

## 디렉토리 구조
${structure.directories.slice(0, 30).join('\n')}
${structure.directories.length > 30 ? `... 외 ${structure.directories.length - 30}개 디렉토리` : ''}

## 주요 코드 파일
`;

  structure.codeFiles.slice(0, 20).forEach(file => {
    result += `\n### ${file.path}\n\`\`\`\n${file.preview}\n\`\`\`\n`;
  });

  if (structure.codeFiles.length > 20) {
    result += `\n... 외 ${structure.codeFiles.length - 20}개 코드 파일\n`;
  }

  result += `\n## 설정 파일\n${structure.configFiles.slice(0, 10).join('\n')}`;

  return result;
}

export default {
  extractCodeStructure,
  formatCodeStructureForPrompt
};
