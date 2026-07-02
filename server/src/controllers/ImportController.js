const importService = require('../services/ImportService');

class ImportController {
  async importStatement(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const userId = req.user.id; // from auth middleware
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      const transactions = await importService.processStatement(userId, fileBuffer, mimeType);

      res.status(200).json({
        success: true,
        message: 'Statement parsed successfully',
        data: transactions
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ImportController();
