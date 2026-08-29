package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// FormatIndentedJSON formats a raw byte slice into pretty indented JSON, or returns raw string on parse failure.
func FormatIndentedJSON(raw []byte, prefix, indent string) string {
	var prettyJSON bytes.Buffer
	if err := json.Indent(&prettyJSON, raw, prefix, indent); err != nil {
		return string(raw)
	}
	return prettyJSON.String()
}

// ExecuteRequest performs an HTTP GET request to the target URL and logs/prints the response.
// Returns success (true if 200 OK), formatted response body, and any encountered error.
func ExecuteRequest(ctx context.Context, httpClient *http.Client, targetURL string) (bool, string, error) {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 10 * time.Second}
	}

	log.Printf("📤 Dispatching keyless mTLS request to %s...", targetURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		log.Printf("❌ Failed to build request: %v", err)
		return false, "", fmt.Errorf("build request failed: %w", err)
	}

	startTime := time.Now()
	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("❌ Request failed (mTLS handshake or server error): %v", err)
		return false, "", fmt.Errorf("request execution failed: %w", err)
	}
	defer resp.Body.Close()

	duration := time.Since(startTime)
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ Failed to read response body: %v", err)
		return false, "", fmt.Errorf("read response body failed: %w", err)
	}

	formatted := FormatIndentedJSON(body, "   │ ", "  ")

	log.Printf("🎉 [RESPONSE %d OK] (%v) Received payload:", resp.StatusCode, duration)
	fmt.Printf("   ┌────────────────────────────────────────────────────────\n")
	fmt.Printf("   │ %s\n", formatted)
	fmt.Printf("   └────────────────────────────────────────────────────────\n")

	isSuccess := resp.StatusCode == http.StatusOK
	return isSuccess, string(body), nil
}

// RunDaemon continuously executes requests on a given ticker interval until context cancellation.
func RunDaemon(ctx context.Context, httpClient *http.Client, targetURL string, interval time.Duration) error {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Initial request
	_, _, _ = ExecuteRequest(ctx, httpClient, targetURL)

	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 Stopping client worker daemon...")
			return ctx.Err()
		case <-ticker.C:
			_, _, _ = ExecuteRequest(ctx, httpClient, targetURL)
		}
	}
}
