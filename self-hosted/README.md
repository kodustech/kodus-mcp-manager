# Kodus MCP Manager - Self Hosted Kit

This directory contains everything you need to run Kodus MCP Manager on your own infrastructure using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed.
- [Docker Compose](https://docs.docker.com/compose/install/) installed (usually included with Docker Desktop).
- **External PostgreSQL Database**: You need a running PostgreSQL instance (v15+ recommended) accessible from the Docker container.

## Setup Instructions

1.  **Download the Kit**:
    If you haven't already, download the `self-hosted/` directory from the repository.

2.  **Configure Environment**:
    Copy the example configuration file to create your production configuration:

    ```bash
    cp .env.example .env
    ```

    Open `.env` in a text editor and fill in the required values.

    **Database Configuration:**
    Ensure you provide the connection details for your external PostgreSQL database:
    - `API_PG_DB_HOST`: Hostname or IP of your Postgres server (e.g., `host.docker.internal` for localhost on Mac/Windows, or your cloud DB host).
    - `API_PG_DB_PORT`: Port (default `5432`).
    - `API_PG_DB_USERNAME`: Database user.
    - `API_PG_DB_PASSWORD`: Database password.
    - `API_PG_DB_DATABASE`: Database name (must exist).

    **Security:**
    - Change `API_MCP_MANAGER_JWT_SECRET` and `API_MCP_MANAGER_ENCRYPTION_SECRET` to secure, random values.

    **MCP Providers:**
    By default, `kodusmcp` and `custom` providers are enabled.
    - `API_MCP_MANAGER_MCP_PROVIDERS`: Comma-separated list of enabled providers (default: `kodusmcp,custom`).
    - **Composio (Optional)**: To use Composio, add `composio` to the providers list and uncomment/set `API_MCP_MANAGER_COMPOSIO_API_KEY`.

3.  **Start the Application**:
    Run the following command to start the service:

    ```bash
    docker compose up -d
    ```

    The first time you run this, it will:
    - Pull the `kodus-mcp-manager` image.
    - Run necessary database migrations on your external database.
    - Start the application.

4.  **Access the Application**:
    The application will be available at `http://localhost:3101` (or the port you configured).

## Troubleshooting

- **Database Connection Issues**:
    - Ensure the database credentials in `.env` are correct.
    - Ensure the database server is running and accessible from the container.
    - If running Postgres on the host machine, use `host.docker.internal` as the host (on Docker Desktop for Mac/Windows) or the host's IP address (on Linux).
- **Migration Failures**: Check the logs using `docker compose logs -f kodus-mcp-manager`.
