CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    roblox_user_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(100),
    display_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venues (
    id SERIAL PRIMARY KEY,
    venue_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS experiences (
    id SERIAL PRIMARY KEY,
    experience_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    minimum_drivers INTEGER DEFAULT 1,
    maximum_drivers INTEGER DEFAULT 20,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,

    venue_id VARCHAR(50) NOT NULL
        REFERENCES venues(venue_id),

    experience_id VARCHAR(50) NOT NULL
        REFERENCES experiences(experience_id),

    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    capacity INTEGER NOT NULL DEFAULT 20,

    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,

    booking_id VARCHAR(100) UNIQUE NOT NULL,

    roblox_user_id BIGINT NOT NULL,

    session_id VARCHAR(100) NOT NULL
        REFERENCES sessions(session_id),

    driver_count INTEGER NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,

    driver_id VARCHAR(100) UNIQUE NOT NULL,

    booking_id VARCHAR(100) NOT NULL
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE,

    roblox_user_id BIGINT,

    username VARCHAR(100),
    display_name VARCHAR(100),

    waiver_accepted BOOLEAN DEFAULT FALSE,

    checked_in BOOLEAN DEFAULT FALSE,

    kart_number INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_date
ON sessions(session_date);

CREATE INDEX IF NOT EXISTS idx_sessions_venue
ON sessions(venue_id);

CREATE INDEX IF NOT EXISTS idx_bookings_user
ON bookings(roblox_user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_session
ON bookings(session_id);

CREATE INDEX IF NOT EXISTS idx_drivers_booking
ON drivers(booking_id);

INSERT INTO venues
    (venue_id, name, location)
VALUES
    ('WATFORD', 'Teamsport Watford', 'Watford')
ON CONFLICT (venue_id) DO NOTHING;


INSERT INTO experiences
    (
        experience_id,
        name,
        description,
        duration_minutes,
        minimum_drivers,
        maximum_drivers
    )
VALUES
    (
        'ULTIMATE',
        'Ultimate Race Experience',
        'A competitive karting experience on the main track.',
        60,
        1,
        20
    )
ON CONFLICT (experience_id) DO NOTHING;

INSERT INTO sessions
(
    session_id,
    venue_id,
    experience_id,
    session_date,
    start_time,
    end_time,
    capacity
)
VALUES
(
    'SES-WAT-20261003-1430',
    'WATFORD',
    'ULTIMATE',
    '2026-10-03',
    '14:30',
    '15:30',
    20
)
ON CONFLICT (session_id) DO NOTHING;
