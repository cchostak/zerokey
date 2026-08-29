package spiffe

import (
	"crypto/x509"
	"net/url"
	"testing"
	"time"

	"github.com/spiffe/go-spiffe/v2/spiffeid"
)

func TestParseIDValid(t *testing.T) {
	uri := "spiffe://demo.local/client-worker"
	id, err := ParseID(uri)
	if err != nil {
		t.Fatalf("expected valid parse, got error: %v", err)
	}
	if id.String() != uri {
		t.Errorf("expected %q, got %q", uri, id.String())
	}
	if id.TrustDomain().String() != "demo.local" {
		t.Errorf("expected trust domain 'demo.local', got %q", id.TrustDomain().String())
	}
	if id.Path() != "/client-worker" {
		t.Errorf("expected path '/client-worker', got %q", id.Path())
	}
}

func TestParseIDInvalid(t *testing.T) {
	testCases := []struct {
		name string
		uri  string
	}{
		{"empty", ""},
		{"invalid scheme", "https://demo.local/client-worker"},
		{"missing host", "spiffe:///client-worker"},
		{"invalid characters", "spiffe://demo.local/bad identifier with spaces"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ParseID(tc.uri)
			if err == nil {
				t.Errorf("expected error parsing %q, but got nil", tc.uri)
			}
		})
	}
}

func TestIsAuthorized(t *testing.T) {
	clientA := spiffeid.RequireFromString("spiffe://demo.local/client-worker")
	clientB := spiffeid.RequireFromString("spiffe://demo.local/attacker-worker")
	clientOtherTD := spiffeid.RequireFromString("spiffe://other.domain/client-worker")
	zeroID := spiffeid.ID{}

	if !IsAuthorized(clientA, clientA) {
		t.Errorf("expected clientA to be authorized for clientA")
	}
	if IsAuthorized(clientA, clientB) {
		t.Errorf("did not expect clientA to authorize clientB")
	}
	if IsAuthorized(clientA, clientOtherTD) {
		t.Errorf("did not expect cross-trust-domain match to authorize")
	}
	if IsAuthorized(clientA, zeroID) {
		t.Errorf("zeroID should never be authorized")
	}
	if IsAuthorized(zeroID, clientA) {
		t.Errorf("zeroID presented should never be authorized")
	}
}

func TestExtractPeerSPIFFEID(t *testing.T) {
	// 1. Empty cert slice
	if id := ExtractPeerSPIFFEID(nil); id != "unknown" {
		t.Errorf("expected 'unknown' for nil certs, got %q", id)
	}

	// 2. Cert with SPIFFE SAN URI
	spiffeURI, _ := url.Parse("spiffe://demo.local/client-worker")
	certWithSPIFFE := &x509.Certificate{
		URIs: []*url.URL{spiffeURI},
	}
	if id := ExtractPeerSPIFFEID([]*x509.Certificate{certWithSPIFFE}); id != "spiffe://demo.local/client-worker" {
		t.Errorf("expected 'spiffe://demo.local/client-worker', got %q", id)
	}

	// 3. Cert with non-spiffe URI
	httpURI, _ := url.Parse("https://example.com/cert")
	certWithHTTP := &x509.Certificate{
		URIs: []*url.URL{httpURI},
	}
	if id := ExtractPeerSPIFFEID([]*x509.Certificate{certWithHTTP}); id != "https://example.com/cert" {
		t.Errorf("expected 'https://example.com/cert', got %q", id)
	}

	// 4. Cert with no URIs
	certEmpty := &x509.Certificate{}
	if id := ExtractPeerSPIFFEID([]*x509.Certificate{certEmpty}); id != "unknown" {
		t.Errorf("expected 'unknown' for cert without URIs, got %q", id)
	}
}

func TestNewSVIDMetadata(t *testing.T) {
	id := spiffeid.RequireFromString("spiffe://demo.local/backend-api")
	expTime := time.Date(2026, 8, 29, 12, 0, 0, 0, time.UTC)
	cert := &x509.Certificate{
		NotAfter: expTime,
	}

	meta := NewSVIDMetadata(id, cert)
	if meta.SPIFFEID != "spiffe://demo.local/backend-api" {
		t.Errorf("unexpected SPIFFE ID: %s", meta.SPIFFEID)
	}
	if meta.TrustDomain != "demo.local" {
		t.Errorf("unexpected trust domain: %s", meta.TrustDomain)
	}
	if !meta.ExpiresAt.Equal(expTime) {
		t.Errorf("unexpected expiry time: %v", meta.ExpiresAt)
	}

	// Test nil cert
	metaNilCert := NewSVIDMetadata(id, nil)
	if !metaNilCert.ExpiresAt.IsZero() {
		t.Errorf("expected zero expiry time for nil cert")
	}
}
