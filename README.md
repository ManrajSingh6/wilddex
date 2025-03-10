# WildDex

A wildlife encounter tracking application that gamifies conservation data collection, created at Calgary Hacks 2025.

## Overview

WildDex transforms wildlife encounters into memorable experiences while contributing to conservation efforts. Inspired by Pokémon, users can "capture" wildlife sightings using their smartphone, creating their personal wildlife index while helping researchers track animal habits and patterns.

## Features

- Image-based wildlife identification using machine learning
- Geolocation tracking for wildlife encounters
- Community feed for sharing discoveries
- Secure user authentication
- Interactive map integration

## Installation

### Prerequisites

- Docker Desktop
- Node.js (with NVM)
- npm

### Setup

1. Clone the repository

```bash
git clone https://github.com/ManrajSingh6/wilddex.git
```

2. Install dependencies in both client and server directories

```bash
cd client && npm install
cd ../server && npm install
```

3. Start the application

```bash
docker compose up --build
```

## Technology Stack

- **Frontend**: React
- **Backend**: Node.js (Express and SocketIO)
- **Database**: PostgreSQL
- **Storage**: Supabase
- **Machine Learning**: TensorFlow
- **Maps**: Google Maps API
- **Containerization**: Docker with Docker Compose Orchestration

---

_WildDex: Turning wildlife encounters into conservation data, one capture at a time._
