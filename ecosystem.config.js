module.exports = {
  apps: [
    {
      name: 'kodus-mcp-manager',
      script: './dist/src/main.js',
      instances: 1,
      autorestart: true,

      // Configurações de memória
      node_args: [
        `--max-old-space-size=64`,
        '--max-http-header-size=16384',
        '--trace-warnings',
        '--unhandled-rejections=strict',
        '--max-semi-space-size=128',
      ],

      // Controle de ciclo de vida
      listen_timeout: 300000,
      kill_timeout: 30000,
      wait_ready: true,
      shutdown_with_message: true,

      // Logs
      merge_logs: true,
      out_file: '/dev/stdout',
      error_file: '/dev/stderr',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_type: 'json',

      // Monitoramento
      min_uptime: '5m',
      max_restarts: 10,
      restart_delay: 5000,

      // Variáveis de ambiente
      env: {
        NODE_ENV: process.env.API_MCP_MANAGER_NODE_ENV || 'production',
        CONTAINER_NAME: 'kodus-mcp-manager',
        API_PORT: '3101',
        NODE_OPTIONS: '--max-http-header-size=16384 --trace-warnings',
        LOG_LEVEL: process.env.API_MCP_MANAGER_LOG_LEVEL || 'info',
        CACHE_TTL: '3600',
        TIMEOUT: '300000',
      },
    },
  ],
};
