import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// No log download, artifact execution, or package installation in this privileged job.
export async function reportCiFailure({ event, repository, request, reproduce = 'pnpm install --frozen-lockfile, pnpm exec tsc --noEmit, pnpm test' }) {
  const runId = event.workflow_run?.id;
  if (!Number.isSafeInteger(runId) || runId < 1) return 'ignored';
  const run = await request('GET', `/repos/${repository}/actions/runs/${runId}`);
  const branch = event.repository?.default_branch;
  if (!branch || event.repository?.full_name !== repository || run.event !== 'push' ||
      run.name !== 'CI' || run.head_branch !== branch || run.conclusion !== 'failure' ||
      run.head_repository?.full_name !== repository ||
      !/^[a-f0-9]{40}$/.test(run.head_sha ?? '') ||
      !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1) return 'ignored';

  const incidentMarker = '<!-- harness-main-ci-failure -->';
  // A rerun is a new occurrence; re-delivery of the same attempt is not.
  const occurrence = `<!-- ci-run:${runId}:${run.run_attempt} -->`;
  const body = [
    incidentMarker, occurrence,
    `기본 브랜치 \`${branch}\`의 CI 검사에 실패했습니다.`,
    '',
    `- 커밋: ${run.head_sha}`,
    `- 실행: https://github.com/${repository}/actions/runs/${runId}/attempts/${run.run_attempt}`,
    '- 기대 결과: 타입 검사와 테스트가 모두 통과해야 합니다.',
    `- 재현: ${reproduce}`,
    '',
    '실행 로그에서 실패 단계를 확인해 주세요. 원본 로그·비밀값은 이 이슈에 복사하지 않습니다.',
    '동일 파이프라인의 반복 실패는 이 이슈에 모읍니다. 원인이 서로 다르면 별도 이슈로 분리하세요.'
  ].join('\n');
  let existing;
  for (let page = 1; ; page++) {
    const issues = await request('GET', `/repos/${repository}/issues?state=open&per_page=100&page=${page}`);
    existing = issues.find(issue => !issue.pull_request && issue.body?.includes(incidentMarker) &&
      issue.user?.login === 'github-actions[bot]');
    if (existing || issues.length < 100) break;
  }
  if (!existing) {
    await request('POST', `/repos/${repository}/issues`, { title: `[CI] ${branch} 검사 실패`, body });
    return 'created';
  }
  if (existing.body?.includes(occurrence)) return 'duplicate';
  for (let page = 1; ; page++) {
    const comments = await request('GET', `/repos/${repository}/issues/${existing.number}/comments?per_page=100&page=${page}`);
    if (comments.some(c => c.user?.login === 'github-actions[bot]' && c.body?.includes(occurrence))) return 'duplicate';
    if (comments.length < 100) break;
  }
  await request('POST', `/repos/${repository}/issues/${existing.number}/comments`, { body });
  return 'updated';
}

async function main() {
  const { GITHUB_REPOSITORY: repository, GITHUB_EVENT_PATH: eventPath, GH_TOKEN: token } = process.env;
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !eventPath || !token) {
    throw new Error('Missing or invalid GitHub workflow context');
  }
  const event = JSON.parse(await readFile(eventPath, 'utf8'));
  const request = async (method, endpoint, body) => {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });
    // Do not retry writes blindly: the server might have accepted them.
    if (!response.ok) throw new Error(`GitHub API ${method} failed (${response.status})`);
    return response.json();
  };
  console.log(await reportCiFailure({ event, repository, request, reproduce: process.env.CI_REPRO_COMMANDS }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('CI failure reporting failed; inspect workflow permissions and API availability.'); process.exitCode = 1; });
}
