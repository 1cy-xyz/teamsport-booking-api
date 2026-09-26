const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const db = req.app.locals.db;

        const result = await db.query(`
            SELECT
                experience_id,
                name,
                description,
                duration_minutes,
                minimum_drivers,
                maximum_drivers
            FROM experiences
            WHERE active = TRUE
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            experiences: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Failed to retrieve experiences"
        });
    }
});


router.get("/:experienceId", async (req, res) => {
    try {
        const db = req.app.locals.db;

        const result = await db.query(`
            SELECT
                experience_id,
                name,
                description,
                duration_minutes,
                minimum_drivers,
                maximum_drivers
            FROM experiences
            WHERE experience_id = $1
            AND active = TRUE
        `, [req.params.experienceId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Experience not found"
            });
        }

        res.json({
            success: true,
            experience: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Failed to retrieve experience"
        });
    }
});


module.exports = router;
