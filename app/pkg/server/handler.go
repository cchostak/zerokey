package server

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"zerokey-demo/pkg/spiffe"
)

// HealthResponse represents the payload returned by the /api/health endpoint.
type HealthResponse struct {
	Status         string `json:"status"`
	ServerSPIFFEID string `json:"server_spiffe_id"`
	Timestamp      string `json:"timestamp"`
}

// ProtectedPayload represents the protected secret payload.
type ProtectedPayload struct {
	SecretVaultToken string `json:"secret_vault_token"`
	AccessGrantedAt  string `json:"access_granted_at"`
	Environment      string `json:"environment"`
	IdentityProvider string `json:"identity_provider"`
}

// SecretDataResponse represents the payload returned by the /api/secret-data endpoint.
type SecretDataResponse struct {
	Status                      string           `json:"status"`
	Message                     string           `json:"message"`
	AuthenticatedClientSPIFFEID string           `json:"authenticated_client_spiffe_id"`
	ServerSPIFFEID              string           `json:"server_spiffe_id"`
	Timestamp                   string           `json:"timestamp"`
	ProtectedPayload            ProtectedPayload `json:"protected_payload"`
}

// HealthHandler returns an HTTP handler for health checking.
func HealthHandler(serverSPIFFEID string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		resp := HealthResponse{
			Status:         "healthy",
			ServerSPIFFEID: serverSPIFFEID,
			Timestamp:      time.Now().UTC().Format(time.RFC3339),
		}
		_ = json.NewEncoder(w).Encode(resp)
	}
}

// SecretDataHandler returns an HTTP handler serving protected data over authenticated mTLS.
func SecretDataHandler(serverSPIFFEID string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		clientSPIFFEID := "unknown"
		if r.TLS != nil && len(r.TLS.PeerCertificates) > 0 {
			clientSPIFFEID = spiffe.ExtractPeerSPIFFEID(r.TLS.PeerCertificates)
		}

		log.Printf("🛡️  [AUDIT] Authenticated mTLS request received from: %s", clientSPIFFEID)

		w.Header().Set("Content-Type", "application/json")
		resp := SecretDataResponse{
			Status:                      "success",
			Message:                     "Keyless Authentication Successful via SPIRE/SPIFFE mTLS!",
			AuthenticatedClientSPIFFEID: clientSPIFFEID,
			ServerSPIFFEID:              serverSPIFFEID,
			Timestamp:                   time.Now().UTC().Format(time.RFC3339),
			ProtectedPayload: ProtectedPayload{
				SecretVaultToken: "dynamic-keyless-token-xyz-7890",
				AccessGrantedAt:  time.Now().UTC().Format(time.RFC3339),
				Environment:      "production-demo",
				IdentityProvider: "SPIRE Node & Workload Attestor",
			},
		}

		_ = json.NewEncoder(w).Encode(resp)
	}
}

// NewMux creates and registers all HTTP routes for the backend server.
func NewMux(serverSPIFFEID string) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", HealthHandler(serverSPIFFEID))
	mux.HandleFunc("/api/secret-data", SecretDataHandler(serverSPIFFEID))
	return mux
}
