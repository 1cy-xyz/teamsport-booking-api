const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const db = req.app.locals.db;

        const result = await db.query(`
            SELECT
                venue_id,
                name,
                location
            FROM venues
            WHERE active = TRUE
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            venues: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Failed to retrieve venues"
        });
    }
});


router.get("/:venueId", async (req, res) => {
    try {
        const db = req.app.locals.db;

        const result = await db.query(`
            SELECT
                venue_id,
                name,
                location
            FROM venues
            WHERE venue_id = $1
            AND active = TRUE
        `, [req.params.venueId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Venue not found"
            });
        }

        res.json({
            success: true,
            venue: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Failed to retrieve venue"
        });
    }
});


module.exports = router;