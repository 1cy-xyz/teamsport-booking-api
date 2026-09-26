const express = require("express");

const router = express.Router();


router.get("/", async (req, res) => {

    try {

        const db = req.app.locals.db;

        const {
            venue,
            date,
            experience
        } = req.query;

        let query = `
            SELECT
                s.session_id,
                s.venue_id,
                v.name AS venue_name,

                s.experience_id,
                e.name AS experience_name,

                s.session_date,
                s.start_time,
                s.end_time,

                s.capacity,

                COALESCE(
                    SUM(
                        CASE
                            WHEN b.status = 'CONFIRMED'
                            THEN b.driver_count
                            ELSE 0
                        END
                    ),
                    0
                ) AS booked

            FROM sessions s

            JOIN venues v
                ON v.venue_id = s.venue_id

            JOIN experiences e
                ON e.experience_id = s.experience_id

            LEFT JOIN bookings b
                ON b.session_id = s.session_id

            WHERE s.status = 'OPEN'
        `;

        const values = [];

        if (venue) {
            values.push(venue);
            query += ` AND s.venue_id = $${values.length}`;
        }

        if (date) {
            values.push(date);
            query += ` AND s.session_date = $${values.length}`;
        }

        if (experience) {
            values.push(experience);
            query += ` AND s.experience_id = $${values.length}`;
        }

        query += `
            GROUP BY
                s.id,
                s.session_id,
                s.venue_id,
                v.name,
                s.experience_id,
                e.name,
                s.session_date,
                s.start_time,
                s.end_time,
                s.capacity

            ORDER BY
                s.session_date ASC,
                s.start_time ASC
        `;

        const result = await db.query(query, values);

        const sessions = result.rows.map(session => {

            const booked = Number(session.booked);
            const capacity = Number(session.capacity);
            const available = Math.max(capacity - booked, 0);

            return {
                sessionId: session.session_id,

                venue: {
                    id: session.venue_id,
                    name: session.venue_name
                },

                experience: {
                    id: session.experience_id,
                    name: session.experience_name
                },

                date: session.session_date,
                startTime: session.start_time,
                endTime: session.end_time,

                capacity,
                booked,
                available,

                status:
                    available <= 0
                        ? "SOLD_OUT"
                        : "AVAILABLE"
            };
        });

        res.json({
            success: true,
            sessions
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            error: "Failed to retrieve sessions"
        });
    }
});


router.get("/:sessionId", async (req, res) => {

    try {

        const db = req.app.locals.db;

        const result = await db.query(`
            SELECT
                s.session_id,
                s.venue_id,
                v.name AS venue_name,

                s.experience_id,
                e.name AS experience_name,

                s.session_date,
                s.start_time,
                s.end_time,

                s.capacity,

                COALESCE(
                    SUM(
                        CASE
                            WHEN b.status = 'CONFIRMED'
                            THEN b.driver_count
                            ELSE 0
                        END
                    ),
                    0
                ) AS booked

            FROM sessions s

            JOIN venues v
                ON v.venue_id = s.venue_id

            JOIN experiences e
                ON e.experience_id = s.experience_id

            LEFT JOIN bookings b
                ON b.session_id = s.session_id

            WHERE s.session_id = $1

            GROUP BY
                s.id,
                s.session_id,
                s.venue_id,
                v.name,
                s.experience_id,
                e.name,
                s.session_date,
                s.start_time,
                s.end_time,
                s.capacity
        `, [req.params.sessionId]);

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                error: "Session not found"
            });
        }

        const session = result.rows[0];

        const booked = Number(session.booked);
        const capacity = Number(session.capacity);
        const available = Math.max(capacity - booked, 0);

        res.json({
            success: true,

            session: {
                sessionId: session.session_id,

                venue: {
                    id: session.venue_id,
                    name: session.venue_name
                },

                experience: {
                    id: session.experience_id,
                    name: session.experience_name
                },

                date: session.session_date,
                startTime: session.start_time,
                endTime: session.end_time,

                capacity,
                booked,
                available,

                status:
                    available <= 0
                        ? "SOLD_OUT"
                        : "AVAILABLE"
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            error: "Failed to retrieve session"
        });
    }
});


module.exports = router;
