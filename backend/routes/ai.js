const express = require("express");
const router = express.Router();
const { getFeasibilityReport, askAdvisorQuestion } = require("../controllers/aiController");

// POST /api/ai/advisor
router.post("/advisor", getFeasibilityReport);

// POST /api/ai/qa
router.post("/qa", askAdvisorQuestion);

module.exports = router;
