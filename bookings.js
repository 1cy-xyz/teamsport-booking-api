const express = require("express");
const crypto = require("crypto");

const router = express.Router();


function generateBookingId() {

    const random = crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase();

    return `TS-${new Date().getFullYear()}-${random}`;
}


function generateDriverId() {

    return `DRV-${crypto
        .randomBytes(6)
        .toString("hex")
        .toUpperCase()}`;
}


/*
    CREATE BOOKING
*/

router.post("/", async (req, res) => {

    const db = req.app.locals.db;

    const {
        robloxUserId,
        username,
        displayName,
        sessionId,
        driverCount
    } = req.body;


    if (
        !robloxUserId ||
        !sessionId ||
        !driverCount
    ) {

        return res.status(400).json({
            success: false,
            error: "Missing required booking information"
        });
    }


    if (
        !Number.isInteger(Number(driverCount)) ||
        Number(driverCount) < 1
    ) {

        return res.status(400).json({
            success: false,
            error: "Invalid driver count"
        });
    }


    const client = await db.connect();


    try {

        await client.query("BEGIN");


        /*
            Get session and lock it.

            This prevents two people from booking
            the final spaces simultaneously.
        */

        const sessionResult = await client.query(`
            SELECT
                s.*,

                e.minimum_drivers,
                e.maximum_drivers

            FROM sessions s

            JOIN experiences e
                ON e.experience_id = s.experience_id

            WHERE s.session_id = $1

            FOR UPDATE
        `, [sessionId]);


        if (sessionResult.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                error: "Session not found"
            });
        }


        const session = sessionResult.rows[0];


        if (session.status !== "OPEN") {

            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                error: "This session is not available"
            });
        }


        const requestedDrivers = Number(driverCount);


        if (
            requestedDrivers < session.minimum_drivers ||
            requestedDrivers > session.maximum_drivers
        ) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                error: `Driver count must be between ${session.minimum_drivers} and ${session.maximum_drivers}`
            });
        }


        /*
            Calculate existing bookings.
        */

        const bookedResult = await client.query(`
            SELECT
                COALESCE(
                    SUM(driver_count),
                    0
                ) AS booked

            FROM bookings

            WHERE session_id = $1
            AND status = 'CONFIRMED'
        `, [sessionId]);


        const alreadyBooked =
            Number(bookedResult.rows[0].booked);


        const available =
            Number(session.capacity) -
            alreadyBooked;


        if (requestedDrivers > available) {

            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                error: "Not enough spaces available",

                capacity: Number(session.capacity),
                booked: alreadyBooked,
                available
            });
        }


        /*
            Create booking.
        */

        const bookingId = generateBookingId();


        await client.query(`
            INSERT INTO bookings
            (
                booking_id,
                roblox_user_id,
                session_id,
                driver_count,
                status
            )

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                'CONFIRMED'
            )
        `, [
            bookingId,
            robloxUserId,
            sessionId,
            requestedDrivers
        ]);


        /*
            Create the person making the booking
            as the first driver.
        */

        const firstDriverId = generateDriverId();


        await client.query(`
            INSERT INTO drivers
            (
                driver_id,
                booking_id,
                roblox_user_id,
                username,
                display_name
            )

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5
            )
        `, [
            firstDriverId,
            bookingId,
            robloxUserId,
            username || null,
            displayName || username || null
        ]);


        await client.query("COMMIT");


        res.status(201).json({

            success: true,

            booking: {
                bookingId,

                sessionId,

                robloxUserId,

                driverCount:
                    requestedDrivers,

                status: "CONFIRMED"
            }

        });


    } catch (error) {

        await client.query("ROLLBACK");

        console.error(error);

        res.status(500).json({
            success: false,
            error: "Failed to create booking"
        });

    } finally {

        client.release();
    }
});


/*
    GET BOOKING
*/

router.get("/:bookingId", async (req, res) => {

    try {

        const db = req.app.locals.db;

        const bookingResult = await db.query(`
            SELECT
                b.booking_id,
                b.roblox_user_id,
                b.session_id,
                b.driver_count,
                b.status,
                b.created_at,

                s.session_date,
                s.start_time,
                s.end_time,

                v.venue_id,
                v.name AS venue_name,

                e.experience_id,
                e.name AS experience_name

            FROM bookings b

            JOIN sessions s
                ON s.session_id = b.session_id

            JOIN venues v
                ON v.venue_id = s.venue_id

            JOIN experiences e
                ON e.experience_id = s.experience_id

            WHERE b.booking_id = $1
        `, [req.params.bookingId]);


        if (bookingResult.rows.length === 0) {

            return res.status(404).json({
                success: false,
                error: "Booking not found"
            });
        }


        const booking = bookingResult.rows[0];


        const driversResult = await db.query(`
            SELECT
                driver_id,
                roblox_user_id,
                username,
                display_name,
                waiver_accepted,
                checked_in,
                kart_number

            FROM drivers

            WHERE booking_id = $1

            ORDER BY id ASC
        `, [booking.booking_id]);


        res.json({

            success: true,

            booking: {

                bookingId:
                    booking.booking_id,

                robloxUserId:
                    booking.roblox_user_id,

                status:
                    booking.status,

                driverCount:
                    booking.driver_count,

                session: {

                    sessionId:
                        booking.session_id,

                    date:
                        booking.session_date,

                    startTime:
                        booking.start_time,

                    endTime:
                        booking.end_time
                },

                venue: {

                    id:
                        booking.venue_id,

                    name:
                        booking.venue_name
                },

                experience: {

                    id:
                        booking.experience_id,

                    name:
                        booking.experience_name
                },

                drivers:
                    driversResult.rows
            }

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            error: "Failed to retrieve booking"
        });
    }
});


/*
    GET PLAYER BOOKINGS
*/

router.get("/player/:robloxUserId", async (req, res) => {

    try {

        const db = req.app.locals.db;

        const result = await db.query(`
            SELECT

                b.booking_id,
                b.session_id,

                b.driver_count,
                b.status,

                s.session_date,
                s.start_time,
                s.end_time,

                v.name AS venue_name,

                e.name AS experience_name

            FROM bookings b

            JOIN sessions s
                ON s.session_id = b.session_id

            JOIN venues v
                ON v.venue_id = s.venue_id

            JOIN experiences e
                ON e.experience_id = s.experience_id

            WHERE b.roblox_user_id = $1

            ORDER BY
                s.session_date DESC,
                s.start_time DESC
        `, [req.params.robloxUserId]);


        res.json({

            success: true,

            bookings: result.rows
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            error: "Failed to retrieve player bookings"
        });
    }
});


/*
    ADD DRIVER
*/

router.post("/:bookingId/drivers", async (req, res) => {

    try {

        const db = req.app.locals.db;

        const {
            robloxUserId,
            username,
            displayName
        } = req.body;


        if (!username && !robloxUserId) {

            return res.status(400).json({
                success: false,
                error: "Driver information required"
            });
        }


        const bookingResult = await db.query(`
            SELECT
                b.*,
                s.capacity,
                e.maximum_drivers

            FROM bookings b

            JOIN sessions s
                ON s.session_id = b.session_id

            JOIN experiences e
                ON e.experience_id = s.experience_id

            WHERE b.booking_id = $1
            AND b.status = 'CONFIRMED'
        `, [req.params.bookingId]);


        if (bookingResult.rows.length === 0) {

            return res.status(404).json({
                success: false,
                error: "Booking not found"
            });
        }


        const booking = bookingResult.rows[0];


        const currentDriversResult = await db.query(`
            SELECT COUNT(*)::INTEGER AS count

            FROM drivers

            WHERE booking_id = $1
        `, [req.params.bookingId]);


        const currentDrivers =
            currentDriversResult.rows[0].count;


        if (
            currentDrivers >=
            Number(booking.driver_count)
        ) {

            return res.status(409).json({
                success: false,
                error: "All driver spaces have already been registered"
            });
        }


        const driverId = generateDriverId();


        await db.query(`
            INSERT INTO drivers
            (
                driver_id,
                booking_id,
                roblox_user_id,
                username,
                display_name
            )

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5
            )
        `, [
            driverId,
            req.params.bookingId,
            robloxUserId || null,
            username || null,
            displayName || username || null
        ]);


        res.status(201).json({

            success: true,

            driver: {
                driverId,
                bookingId: req.params.bookingId,
                robloxUserId,
                username,
                displayName
            }

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            error: "Failed to add driver"
        });
    }
});


/*
    CANCEL BOOKING
*/

router.post("/:bookingId/cancel", async (req, res) => {

    try {

        const db = req.app.locals.db;

        const result = await db.query(`
            UPDATE bookings

            SET
                status = 'CANCELLED',
                updated_at = CURRENT_TIMESTAMP

            WHERE booking_id = $1
            AND status = 'CONFIRMED'

            RETURNING booking_id
        `, [req.params.bookingId]);


        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                error: "Booking not found or already cancelled"
            });
        }


        res.json({

            success: true,

            bookingId:
                result.rows[0].booking_id,

            status:
                "CANCELLED"
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            error: "Failed to cancel booking"
        });
    }
});


module.exports = router;