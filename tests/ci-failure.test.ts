import { describe, it, expect, vi } from 'vitest';
import { reportCiFailure } from '../scripts/report-ci-failure.mjs';

const repository = 'owner/harness';
const event = { repository: { full_name: repository, default_branch: 'main' }, workflow_run: { id: 12 } };
const run = { event: 'push', name: 'CI', head_branch: 'main', conclusion: 'failure',
  head_repository: { full_name: repository }, head_sha: 'a'.repeat(40), run_attempt: 1 };
const bot = { login: 'github-actions[bot]' };
const issue = { number: 8, body: '<!-- harness-main-ci-failure -->', user: bot };
function client(overrides = {}, issues = [], comments = []) {
  const request = vi.fn(async (method, endpoint) => {
    if (method === 'POST') return {};
    if (endpoint.includes('/actions/runs/')) return { ...run, ...overrides };
    if (endpoint.includes('/comments?')) return comments;
    return issues;
  });
  return request;
}
const execute = request => reportCiFailure({ event, repository, request });
describe('main CI issue reporting', () => {
  it.each([
    { event: 'pull_request' }, { event: 'workflow_dispatch' }, { head_branch: 'feature' },
    { conclusion: 'success' }, { conclusion: 'cancelled' }, { name: 'Unrelated workflow' },
    { head_repository: { full_name: 'fork/harness' } }, { head_sha: 'invalid' }
  ])('ignores non-eligible run %j', async override => {
    const request = client(override);
    expect(await execute(request)).toBe('ignored');
    expect(request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
  });
  it('creates an issue for a failed default-branch push, without downloading logs', async () => {
    const request = client();
    expect(await execute(request)).toBe('created');
    expect(request).toHaveBeenCalledWith('POST', '/repos/owner/harness/issues',
      expect.objectContaining({ title: '[CI] main 검사 실패', body: expect.stringContaining('ci-run:12:1') }));
    expect(request.mock.calls.some(([, url]) => url.includes('/logs'))).toBe(false);
  });
  it('adds a repeated failure to the existing incident', async () => {
    const request = client({}, [issue]);
    expect(await execute(request)).toBe('updated');
    expect(request).toHaveBeenCalledWith('POST', '/repos/owner/harness/issues/8/comments', expect.any(Object));
  });
  it('does not repeat the initial occurrence', async () => {
    const request = client({}, [{ ...issue, body: issue.body + '<!-- ci-run:12:1 -->' }]);
    expect(await execute(request)).toBe('duplicate');
    expect(request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
  });
  it('does not repeat an occurrence already in a bot comment', async () => {
    const request = client({}, [issue], [{ user: bot, body: '<!-- ci-run:12:1 -->' }]);
    expect(await execute(request)).toBe('duplicate');
  });
  it('does not treat a PR or human-authored marker as the bot incident', async () => {
    const request = client({}, [{ ...issue, pull_request: {} }, { ...issue, user: { login: 'someone' } }]);
    expect(await execute(request)).toBe('created');
  });
  it('searches beyond the first issue page before creating', async () => {
    const request = client();
    request.mockImplementation(async (method, endpoint) => {
      if (method === 'POST') return {};
      if (endpoint.includes('/actions/runs/')) return run;
      if (endpoint.includes('/comments?')) return [];
      return endpoint.endsWith('page=1') ? Array.from({ length: 100 }, () => ({ body: '' })) : [issue];
    });
    expect(await execute(request)).toBe('updated');
  });
  it('does not create an issue if duplicate lookup fails', async () => {
    const request = client();
    request.mockImplementation(async (method, endpoint) => {
      if (endpoint.includes('/actions/runs/')) return run;
      throw new Error('API unavailable');
    });
    await expect(execute(request)).rejects.toThrow('API unavailable');
    expect(request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
  });
});
