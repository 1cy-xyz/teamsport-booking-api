require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const venuesRouter = require("./routes/venues");
const experiencesRouter = require("./routes/experiences");
const sessionsRouter = require("./routes/sessions");
const bookingsRouter = require("./routes/bookings");

const app = express();

const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false
});

app.locals.db = pool;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        success: true,
        service: "Teamsport E-Karting Booking API",
        version: "1.0.0"
    });
});

app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            success: true,
            database: "connected"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            database: "disconnected"
        });
    }
});

app.use("/api/venues", venuesRouter);
app.use("/api/experiences", experiencesRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/bookings", bookingsRouter);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found"
    });
});

app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        success: false,
        error: "Internal server error"
    });
});

app.listen(PORT, () => {
    console.log(`Teamsport Booking API running on port ${PORT}`);
});