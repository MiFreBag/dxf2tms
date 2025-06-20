const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

// Route zum Abrufen aller Jobs
router.get('/', jobController.getJobs);

// Route zum Abbrechen eines Jobs
router.post('/:id/cancel', jobController.cancelJob);

// Route zum Wiederholen eines Jobs
router.post('/:id/retry', jobController.retryJob);

// Route zum Löschen eines Jobs
router.delete('/:id', jobController.deleteJob);

module.exports = router;