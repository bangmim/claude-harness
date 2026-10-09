const MANAGED_START = /^[ \t]*<!--\s*ch:managed\s+start\s*-->[ \t]*\r?$/m;
const MANAGED_END = /^[ \t]*<!--\s*ch:managed\s+end\s*-->[ \t]*\r?$/m;
const USER_START = /^[ \t]*<!--\s*ch:user\s+start\s*-->[ \t]*\r?$/m;
const USER_END = /^[ \t]*<!--\s*ch:user\s+end\s*-->[ \t]*\r?$/m;
export function detectMarkers(content) {
    const mStart = MANAGED_START.test(content);
    const mEnd = MANAGED_END.test(content);
    const uStart = USER_START.test(content);
    const uEnd = USER_END.test(content);
    const managed = mStart && mEnd;
    const user = uStart && uEnd;
    const managedBroken = mStart !== mEnd;
    const userBroken = uStart !== uEnd;
    if (managedBroken || userBroken)
        return "broken";
    if (managed && user)
        return "both";
    if (managed)
        return "managed-only";
    if (user)
        return "user-only";
    return "none";
}
function findManagedRange(content) {
    const startMatch = content.match(MANAGED_START);
    const endMatch = content.match(MANAGED_END);
    if (!startMatch || !endMatch)
        return null;
    const startIdx = startMatch.index;
    const startLineEnd = content.indexOf("\n", startIdx);
    const endIdx = endMatch.index;
    return {
        start: startLineEnd + 1,
        end: endIdx,
        startLine: startMatch[0],
        endLine: endMatch[0]
    };
}
export function extractManagedSection(content) {
    const range = findManagedRange(content);
    if (!range)
        return null;
    return content.slice(range.start, range.end).trimEnd();
}
export function replaceManagedSection(oldContent, newBody) {
    const range = findManagedRange(oldContent);
    if (!range) {
        throw new Error("ch:managed markers not found or broken");
    }
    const before = oldContent.slice(0, range.start);
    const after = oldContent.slice(range.end);
    const normalized = newBody.endsWith("\n") ? newBody : newBody + "\n";
    return before + normalized + after;
}
