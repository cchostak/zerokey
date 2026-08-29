package spiffe

import (
	"crypto/x509"
	"fmt"
	"time"

	"github.com/spiffe/go-spiffe/v2/spiffeid"
)

// ParseID validates and parses a raw URI string into a SPIFFE ID.
func ParseID(uri string) (spiffeid.ID, error) {
	if uri == "" {
		return spiffeid.ID{}, fmt.Errorf("SPIFFE ID cannot be empty")
	}
	id, err := spiffeid.FromString(uri)
	if err != nil {
		return spiffeid.ID{}, fmt.Errorf("invalid SPIFFE ID %q: %w", uri, err)
	}
	return id, nil
}

// IsAuthorized checks if the presented SPIFFE ID matches the expected authorized SPIFFE ID.
func IsAuthorized(presented, authorized spiffeid.ID) bool {
	if presented.IsZero() || authorized.IsZero() {
		return false
	}
	return presented == authorized
}

// ExtractPeerSPIFFEID parses the peer certificates presented during an mTLS handshake
// and extracts the first SAN URI corresponding to a SPIFFE ID.
func ExtractPeerSPIFFEID(peerCerts []*x509.Certificate) string {
	if len(peerCerts) == 0 {
		return "unknown"
	}
	for _, uri := range peerCerts[0].URIs {
		if uri != nil && uri.Scheme == "spiffe" {
			return uri.String()
		}
	}
	// Fallback to first URI if scheme was not spiffe or SAN format differs
	if len(peerCerts[0].URIs) > 0 && peerCerts[0].URIs[0] != nil {
		return peerCerts[0].URIs[0].String()
	}
	return "unknown"
}

// SVIDMetadata contains summary fields for logging and audit purposes.
type SVIDMetadata struct {
	SPIFFEID    string    `json:"spiffe_id"`
	TrustDomain string    `json:"trust_domain"`
	ExpiresAt   time.Time `json:"expires_at"`
}

// NewSVIDMetadata creates an SVIDMetadata summary from an ID and certificate.
func NewSVIDMetadata(id spiffeid.ID, cert *x509.Certificate) SVIDMetadata {
	meta := SVIDMetadata{
		SPIFFEID:    id.String(),
		TrustDomain: id.TrustDomain().String(),
	}
	if cert != nil {
		meta.ExpiresAt = cert.NotAfter
	}
	return meta
}
