package server

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	serverID := "spiffe://demo.local/backend-api"
	handler := HealthHandler(serverID)

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rr := httptest.NewRecorder()

	handler(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	contentType := rr.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type 'application/json', got %q", contentType)
	}

	var resp HealthResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response JSON: %v", err)
	}

	if resp.Status != "healthy" {
		t.Errorf("expected status 'healthy', got %q", resp.Status)
	}
	if resp.ServerSPIFFEID != serverID {
		t.Errorf("expected server_spiffe_id %q, got %q", serverID, resp.ServerSPIFFEID)
	}
	if resp.Timestamp == "" {
		t.Errorf("expected timestamp to be non-empty")
	}
}

func TestSecretDataHandlerWithoutTLS(t *testing.T) {
	serverID := "spiffe://demo.local/backend-api"
	handler := SecretDataHandler(serverID)

	req := httptest.NewRequest(http.MethodGet, "/api/secret-data", nil)
	rr := httptest.NewRecorder()

	handler(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Fatalf("handler returned status code %v, want %v", status, http.StatusOK)
	}

	var resp SecretDataResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode JSON response: %v", err)
	}

	if resp.Status != "success" {
		t.Errorf("expected status 'success', got %q", resp.Status)
	}
	if resp.AuthenticatedClientSPIFFEID != "unknown" {
		t.Errorf("expected client SPIFFE ID 'unknown' when no TLS present, got %q", resp.AuthenticatedClientSPIFFEID)
	}
	if resp.ServerSPIFFEID != serverID {
		t.Errorf("expected server SPIFFE ID %q, got %q", serverID, resp.ServerSPIFFEID)
	}
	if resp.ProtectedPayload.SecretVaultToken != "dynamic-keyless-token-xyz-7890" {
		t.Errorf("unexpected secret token: %s", resp.ProtectedPayload.SecretVaultToken)
	}
}

func TestSecretDataHandlerWithPeerCert(t *testing.T) {
	serverID := "spiffe://demo.local/backend-api"
	clientSPIFFE := "spiffe://demo.local/client-worker"
	spiffeURI, _ := url.Parse(clientSPIFFE)

	peerCert := &x509.Certificate{
		URIs: []*url.URL{spiffeURI},
	}

	handler := SecretDataHandler(serverID)

	req := httptest.NewRequest(http.MethodGet, "/api/secret-data", nil)
	req.TLS = &tls.ConnectionState{
		PeerCertificates: []*x509.Certificate{peerCert},
	}

	rr := httptest.NewRecorder()
	handler(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200, got %d", rr.Code)
	}

	var resp SecretDataResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse JSON response: %v", err)
	}

	if resp.AuthenticatedClientSPIFFEID != clientSPIFFE {
		t.Errorf("expected authenticated client ID %q, got %q", clientSPIFFE, resp.AuthenticatedClientSPIFFEID)
	}
	if resp.ProtectedPayload.Environment != "production-demo" {
		t.Errorf("expected environment 'production-demo', got %q", resp.ProtectedPayload.Environment)
	}
}

func TestNewMuxRoutes(t *testing.T) {
	serverID := "spiffe://demo.local/backend-api"
	mux := NewMux(serverID)

	// Test /api/health routing
	reqHealth := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rrHealth := httptest.NewRecorder()
	mux.ServeHTTP(rrHealth, reqHealth)
	if rrHealth.Code != http.StatusOK {
		t.Errorf("GET /api/health expected 200, got %d", rrHealth.Code)
	}

	// Test /api/secret-data routing
	reqData := httptest.NewRequest(http.MethodGet, "/api/secret-data", nil)
	rrData := httptest.NewRecorder()
	mux.ServeHTTP(rrData, reqData)
	if rrData.Code != http.StatusOK {
		t.Errorf("GET /api/secret-data expected 200, got %d", rrData.Code)
	}

	// Test 404
	reqNotFound := httptest.NewRequest(http.MethodGet, "/api/unknown", nil)
	rrNotFound := httptest.NewRecorder()
	mux.ServeHTTP(rrNotFound, reqNotFound)
	if rrNotFound.Code != http.StatusNotFound {
		t.Errorf("GET /api/unknown expected 404, got %d", rrNotFound.Code)
	}
}
