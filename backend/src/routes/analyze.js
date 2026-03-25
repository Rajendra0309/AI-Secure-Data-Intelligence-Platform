const express = require('express');
const multer = require('multer');
const { analyzeContent } = require('../controllers/analyzeController');
const { getAnalysisHistory, getAnalysisHistoryById } = require('../controllers/historyController');

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/analyze', upload.single('file'), analyzeContent);
router.get('/history', getAnalysisHistory);
router.get('/history/:id', getAnalysisHistoryById);

module.exports = router;
