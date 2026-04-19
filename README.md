# Hospital In-Patient Management System

A modern, scalable healthcare management solution designed for small clinics and hospitals. Built with Python FastAPI backend and React frontend.

## Features

- 🏥 **Patient Management**: Complete patient lifecycle management
- 📋 **Medical Records**: Electronic health records system
- 💰 **Billing**: Automated billing and payment tracking
- 🛏️ **Room Management**: Bed and ward allocation
- 👨‍⚕️ **Staff Management**: Doctor and nurse scheduling
- 📊 **Reports**: Financial and operational reports
- 🔐 **Security**: JWT-based authentication

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Or: Python 3.11+, Node.js 18+, PostgreSQL 13+

### With Docker (Recommended)

```bash
# Clone and setup
cd happykids
docker-compose up
```

Access the application:
- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm start
```

#### Database

Create PostgreSQL database and update connection string in `.env`

## Project Structure

```
happykids/
├── backend/           # FastAPI application
├── frontend/          # React application
├── docker-compose.yml # Docker configuration
└── README.md
```

## API Documentation

Once running, visit `http://localhost:8000/docs` for interactive API documentation.

## Development

- Backend: `cd backend && uvicorn main:app --reload`
- Frontend: `cd frontend && npm start`
- Database migrations: `cd backend && alembic upgrade head`

## License

MIT
