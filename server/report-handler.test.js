const test = require('node:test');
const assert = require('node:assert/strict');
const createHandler = require('./report-handler');
function fixture() {
  const inserts = [];
  const pool = { query: async (sql, params) => {
    if (sql.includes('FROM conversations')) return { rows: [{ user1_id: 1, user2_id: 2 }] };
    if (sql.includes('FROM users')) return { rows: [{ id: 1, full_name: 'Reporter' }, { id: 2, full_name: 'Reported' }] };
    inserts.push(params); return { rows: [{ id: 42 }] };
  } };
  return { inserts, submit: async (body, userId = 1) => {
    const result = { status: 200, body: null };
    const res = { status(code) { result.status = code; return this; }, json(body) { result.body = body; return this; } };
    await createHandler(() => pool)({ user: { id: userId }, body }, res);
    return result;
  } };
}
const details = { reason: 'Harassment or bullying', statement: 'Repeated unwanted messages.' };
test('chat report includes every required moderation field and resolves conversation recipient', async () => {
  const f = fixture(); const result = await f.submit({ ...details, conversationId: '10' });
  assert.equal(result.status, 201); assert.equal(result.body.reportId, 42);
  const row = f.inserts[0]; assert.match(row[0], /^RPT-/); assert.ok(row[0].length <= 50);
  assert.equal(row[2], 'Reporter'); assert.equal(row[3], 2); assert.equal(row[4], 'Reported');
  assert.equal(row[5], 'chat'); assert.ok(row[9]); assert.equal(row[11], 10);
});
test('support reports without a target remain supported and receive unique ticket codes', async () => {
  const f = fixture(); const a = await f.submit(details); const b = await f.submit(details);
  assert.equal(a.status, 201); assert.equal(b.status, 201);
  assert.notEqual(a.body.ticket.id, b.body.ticket.id); assert.equal(f.inserts[0][3], null);
});
test('invalid inputs and unauthorized conversations do not write reports', async () => {
  const f = fixture();
  for (const body of [{ ...details, reason: '' }, { ...details, statement: {} }, { ...details, reportedUserId: 'abc' }, { ...details, reportedUserId: '1' }, { ...details, severity: 'bad' }, { ...details, conversationId: '10', reportedUserId: '3' }]) {
    assert.equal((await f.submit(body)).status, 400);
  }
  assert.equal((await f.submit({ ...details, conversationId: '10' }, 3)).status, 403);
  assert.equal(f.inserts.length, 0);
});
