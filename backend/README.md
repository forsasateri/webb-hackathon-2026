# Backend Service

A FastAPI-based backend service for the course evaluation and selection system.

## Prerequisites

- Python 3.10 or higher
- PostgreSQL database
- macOS, Linux, or WSL (Windows Subsystem for Linux)

## Quick Start

### 1. Install Dependencies

Run the dependency check script to set up the virtual environment and install all required packages:

```bash
chmod +x check_deps.sh
./check_deps.sh
```

This script will:
- Create a Python virtual environment if it doesn't exist
- Install all dependencies from `requirements.txt`
- Verify the installation

### 2. Set Up Database

Initialize the database schema and seed data:

```bash
source venv/bin/activate
bash database/reset.sh
```

This will:
- Drop and recreate all database tables
- Load initial seed data

### 3. Start the Backend Server

Use the start script to launch the backend:

```bash
chmod +x start.sh
./start.sh
```

The script will:
- Stop any existing backend instances
- Start a new server instance
- Make the server accessible on the local network

The server will be available at:
- **Local:** http://localhost:8000
- **Network:** http://YOUR_LOCAL_IP:8000 (displayed in terminal output)

To stop the server, press `Ctrl+C`.

## Manual Setup

If you prefer to set up manually:

### Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Database Migrations

```bash
bash database/reset.sh
```

### Start Server

```bash
uvicorn server.src.I1_entry.app:app --host 0.0.0.0 --port 8000 --reload
```

## Project Structure

```
backend/
├── database/           # Database schema and seed scripts
│   ├── schema.sql     # Database schema definition
│   ├── seed.py        # Data seeding script
│   └── reset.sh       # Database reset script
├── server/
│   └── src/
│       ├── I1_entry/      # Application entry point
│       ├── I2_coordinators/ # API coordinators
│       ├── I3_molecules/   # Service layer
│       └── I4_atoms/       # Utilities and helpers
├── requirements.txt   # Python dependencies
├── check_deps.sh     # Dependency check script
├── start.sh          # Server start script
└── README.md         # This file
```

## API Documentation

Once the server is running, you can access:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Development

### Running in Development Mode

The `start.sh` script runs the server with `--reload` flag, which automatically restarts the server when code changes are detected.

### Stopping the Server

To stop a running server instance:

```bash
# Find the process
ps aux | grep uvicorn

# Kill by PID
kill <PID>
```

Or simply use the `start.sh` script, which automatically stops old instances before starting a new one.

## Troubleshooting

### Port Already in Use

If port 8000 is already in use, the `start.sh` script will attempt to stop the existing process. If this fails, manually kill the process:

```bash
lsof -ti:8000 | xargs kill -9
```

### Database Connection Issues

Ensure PostgreSQL is running and the database credentials in your configuration are correct.

### Missing Dependencies

Run the dependency check script:

```bash
./check_deps.sh
```

### Virtual Environment Not Activated

If you see import errors, ensure the virtual environment is activated:

```bash
source venv/bin/activate
```

## Network Access

The server binds to `0.0.0.0`, making it accessible from other devices on the same local network. Other developers can access your backend using your local IP address.

To find your local IP:

```bash
# On macOS
ipconfig getifaddr en0

# On Linux
hostname -I | awk '{print $1}'
```

Then access the backend at: `http://YOUR_LOCAL_IP:8000`

## Environment Variables

Configure the following environment variables as needed:

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 8000)
- `HOST`: Server host (default: 0.0.0.0)

## License

[Add your license information here]
