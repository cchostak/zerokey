package config

import (
	"os"
	"testing"
)

func TestGetEnv(t *testing.T) {
	key := "TEST_ENV_VAR_ZEROKEY"
	fallback := "default_fallback_value"

	// Ensure unset initially
	os.Unsetenv(key)
	if val := GetEnv(key, fallback); val != fallback {
		t.Fatalf("expected fallback %q, got %q", fallback, val)
	}

	// Set value
	expected := "custom_value_123"
	os.Setenv(key, expected)
	defer os.Unsetenv(key)

	if val := GetEnv(key, fallback); val != expected {
		t.Fatalf("expected %q, got %q", expected, val)
	}
}

func TestLoadServerConfigDefaults(t *testing.T) {
	os.Unsetenv("SPIFFE_ENDPOINT_SOCKET")
	os.Unsetenv("PORT")
	os.Unsetenv("ALLOWED_CLIENT_SPIFFE_ID")

	cfg := LoadServerConfig()

	if cfg.SocketPath != "unix:///run/spire/sockets/agent.sock" {
		t.Errorf("unexpected default socket path: %s", cfg.SocketPath)
	}
	if cfg.Port != "8443" {
		t.Errorf("unexpected default port: %s", cfg.Port)
	}
	if cfg.AllowedClientURI != "spiffe://demo.local/client-worker" {
		t.Errorf("unexpected default allowed client URI: %s", cfg.AllowedClientURI)
	}
}

func TestLoadServerConfigCustom(t *testing.T) {
	os.Setenv("SPIFFE_ENDPOINT_SOCKET", "unix:///tmp/custom.sock")
	os.Setenv("PORT", "9443")
	os.Setenv("ALLOWED_CLIENT_SPIFFE_ID", "spiffe://demo.local/custom-worker")
	defer func() {
		os.Unsetenv("SPIFFE_ENDPOINT_SOCKET")
		os.Unsetenv("PORT")
		os.Unsetenv("ALLOWED_CLIENT_SPIFFE_ID")
	}()

	cfg := LoadServerConfig()

	if cfg.SocketPath != "unix:///tmp/custom.sock" {
		t.Errorf("expected socket unix:///tmp/custom.sock, got %s", cfg.SocketPath)
	}
	if cfg.Port != "9443" {
		t.Errorf("expected port 9443, got %s", cfg.Port)
	}
	if cfg.AllowedClientURI != "spiffe://demo.local/custom-worker" {
		t.Errorf("expected allowed client spiffe://demo.local/custom-worker, got %s", cfg.AllowedClientURI)
	}
}

func TestLoadClientConfigDefaults(t *testing.T) {
	os.Unsetenv("SPIFFE_ENDPOINT_SOCKET")
	os.Unsetenv("SERVER_URL")
	os.Unsetenv("EXPECTED_SERVER_SPIFFE_ID")
	os.Unsetenv("RUN_ONCE")

	cfg := LoadClientConfig(false)

	if cfg.SocketPath != "unix:///run/spire/sockets/agent.sock" {
		t.Errorf("unexpected default socket path: %s", cfg.SocketPath)
	}
	if cfg.ServerURL != "https://backend-api:8443/api/secret-data" {
		t.Errorf("unexpected default server URL: %s", cfg.ServerURL)
	}
	if cfg.ExpectedServerID != "spiffe://demo.local/backend-api" {
		t.Errorf("unexpected default expected server ID: %s", cfg.ExpectedServerID)
	}
	if cfg.RunOnce != false {
		t.Errorf("expected RunOnce to be false")
	}
}

func TestLoadClientConfigRunOnceFlagAndEnv(t *testing.T) {
	// Flag overrides false env
	cfg := LoadClientConfig(true)
	if !cfg.RunOnce {
		t.Errorf("expected RunOnce true when flag is true")
	}

	// Env true
	os.Setenv("RUN_ONCE", "true")
	defer os.Unsetenv("RUN_ONCE")

	cfgEnv := LoadClientConfig(false)
	if !cfgEnv.RunOnce {
		t.Errorf("expected RunOnce true when RUN_ONCE=true")
	}
}
