const { randomUUID } = require('node:crypto');

module.exports = function createReportHandler(getPool) {
  return async (req, res) => {
    try {
      const { reason, statement, attachmentUrl, severity = 'medium' } = req.body || {};
      if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 150) {
        return res.status(400).json({ message: 'Please choose a valid report reason (up to 150 characters).' });
      }
      if (typeof statement !== 'string' || !statement.trim() || Buffer.byteLength(statement.trim(), 'utf8') > 65535) {
        return res.status(400).json({ message: 'Please provide a report statement of up to 65,535 bytes.' });
      }
      if (!['low', 'medium', 'high', 'critical'].includes(severity) || (attachmentUrl != null && typeof attachmentUrl !== 'string')) {
        return res.status(400).json({ message: 'Invalid report details.' });
      }
      const parseId = value => value == null || value === '' ? null : /^\d+$/.test(String(value)) && Number(value) > 0 && Number(value) <= 2147483647 ? Number(value) : NaN;
      let reportedUserId = parseId(req.body.reportedUserId);
      const conversationId = parseId(req.body.conversationId);
      if (Number.isNaN(reportedUserId) || Number.isNaN(conversationId)) {
        return res.status(400).json({ message: 'Invalid user or conversation. Please reopen the chat and try again.' });
      }
      const pool = getPool();
      const reporterId = Number(req.user.id);
      if (conversationId) {
        const { rows } = await pool.query('SELECT user1_id, user2_id FROM conversations WHERE id = $1', [conversationId]);
        const conversation = rows[0];
        if (!conversation || ![Number(conversation.user1_id), Number(conversation.user2_id)].includes(reporterId)) {
          return res.status(403).json({ message: 'You can only report a conversation you participate in.' });
        }
        const otherId = Number(conversation.user1_id) === reporterId ? Number(conversation.user2_id) : Number(conversation.user1_id);
        if (reportedUserId && reportedUserId !== otherId) return res.status(400).json({ message: 'The reported user does not match this conversation.' });
        reportedUserId = otherId;
      }
      if (reportedUserId === reporterId) return res.status(400).json({ message: 'You cannot report your own account.' });
      const { rows: users } = await pool.query('SELECT id, full_name, first_name, last_name, username FROM users WHERE id = $1 OR id = $2', [reporterId, reportedUserId]);
      const reporter = users.find(user => Number(user.id) === reporterId);
      const reported = users.find(user => Number(user.id) === reportedUserId);
      if (!reporter) return res.status(401).json({ message: 'Please sign in again before submitting your report.' });
      if (reportedUserId && !reported) return res.status(404).json({ message: 'The reported account could not be found.' });
      const name = user => (user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Local Farm User').slice(0, 150);
      const reportCode = `RPT-${randomUUID()}`;
      const dateReported = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
      const { rows } = await pool.query(
        `INSERT INTO reports (report_code, reporter_id, reporter_name, reported_user_id, reported_user_name,
          report_type, target_id, reason, statement, date_reported, severity, status, conversation_id, attachment_url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13, NOW()) RETURNING id`,
        [reportCode, reporterId, name(reporter), reportedUserId, reported ? name(reported) : 'Unspecified User',
          conversationId ? 'chat' : 'user', conversationId || reportedUserId, reason.trim(), statement.trim(), dateReported,
          severity, conversationId, attachmentUrl || null],
      );
      return res.status(201).json({
        success: true, reportId: rows[0].id, message: 'Report submitted successfully.',
        ticket: { id: reportCode, category: reason.trim(), subject: statement.trim().split('\n')[0], description: statement.trim(), status: 'Under Review', date: dateReported },
      });
    } catch (error) {
      console.error('[Submit Report Error]', error);
      return res.status(500).json({ message: 'Failed to submit report. Please try again.' });
    }
  };
};
