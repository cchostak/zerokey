package config

import (
	"os"
)

// ServerConfig holds the configuration parameters for the backend API server.
type ServerConfig struct {
	SocketPath       string
	Port             string
	AllowedClientURI string
}

// ClientConfig holds the configuration parameters for the client worker.
type ClientConfig struct {
	SocketPath       string
	ServerURL        string
	ExpectedServerID string
	RunOnce          bool
}

// GetEnv retrieves an environment variable with a fallback default.
func GetEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

// LoadServerConfig loads the server configuration from the environment.
func LoadServerConfig() ServerConfig {
	return ServerConfig{
		SocketPath:       GetEnv("SPIFFE_ENDPOINT_SOCKET", "unix:///run/spire/sockets/agent.sock"),
		Port:             GetEnv("PORT", "8443"),
		AllowedClientURI: GetEnv("ALLOWED_CLIENT_SPIFFE_ID", "spiffe://demo.local/client-worker"),
	}
}

// LoadClientConfig loads the client configuration from the environment.
func LoadClientConfig(runOnceFlag bool) ClientConfig {
	runOnceEnv := GetEnv("RUN_ONCE", "false") == "true"
	return ClientConfig{
		SocketPath:       GetEnv("SPIFFE_ENDPOINT_SOCKET", "unix:///run/spire/sockets/agent.sock"),
		ServerURL:        GetEnv("SERVER_URL", "https://backend-api:8443/api/secret-data"),
		ExpectedServerID: GetEnv("EXPECTED_SERVER_SPIFFE_ID", "spiffe://demo.local/backend-api"),
		RunOnce:          runOnceFlag || runOnceEnv,
	}
}
