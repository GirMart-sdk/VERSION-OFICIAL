"use strict";

const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middlewares/auth");
const StatsService = require("../services/statsService");

const router = express.Router();

// GET /api/stats - KPIs del dashboard
router.get(
  "/stats",
  requireAuth,
  asyncHandler(async (req, res) => {
    const stats = await StatsService.getDashboardStats();
    res.json(stats);
  }),
);

// GET /api/analytics/top-products - Ranking top productos
router.get(
  "/analytics/top-products",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit || 5);
    const top = await StatsService.getTopProducts(Number.isFinite(limit) ? limit : 5);
    res.json(top);
  }),
);

module.exports = router;
