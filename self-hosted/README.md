# Kodus MCP Manager - Self Hosted Kit

This directory contains everything you need to run Kodus MCP Manager on your own infrastructure using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed.
- [Docker Compose](https://docs.docker.com/compose/install/) installed (usually included with Docker Desktop).

## Setup Instructions

1.  **Download the Kit**:
    If you haven't already, download the `self-hosted/` directory from the repository.

2.  **Configure Environment**:
    Copy the example configuration file to create your production configuration:

    ```bash
    cp .env.example .env
    ```

    Open `.env` in a text editor and fill in the required values.
    **Important:** Change the `API_MCP_MANAGER_JWT_SECRET` and `API_MCP_MANAGER_ENCRYPTION_SECRET` to secure values.

3.  **Start the Application**:
    Run the following command to start the services:

    ```bash
    docker compose up -d
    ```

    The first time you run this, it will:
    - Pull the `kodus-mcp-manager` and `postgres` images.
    - Initialize the database.
    - Run necessary database migrations.
    - Start the application.

4.  **Access the Application**:
    The application will be available at `http://localhost:3101` (or the port you configured).

## Troubleshooting

- **Database Connection Issues**: Ensure the database credentials in `.env` match what the application expects.
- **Migration Failures**: Check the logs using `docker compose logs -f kodus-mcp-manager`.
