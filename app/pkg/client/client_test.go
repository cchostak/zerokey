package client

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestFormatIndentedJSON(t *testing.T) {
	rawJSON := []byte(`{"status":"success","code":200}`)
	formatted := FormatIndentedJSON(rawJSON, "", "  ")

	expected := "{\n  \"status\": \"success\",\n  \"code\": 200\n}"
	if formatted != expected {
		t.Errorf("expected formatted JSON:\n%s\ngot:\n%s", expected, formatted)
	}

	// Invalid JSON returns raw string without panicking
	rawInvalid := []byte(`not json at all`)
	formattedInvalid := FormatIndentedJSON(rawInvalid, "", "  ")
	if formattedInvalid != "not json at all" {
		t.Errorf("expected raw string for invalid JSON, got %q", formattedInvalid)
	}
}

func TestExecuteRequestSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"success","message":"ok"}`))
	}))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	success, body, err := ExecuteRequest(ctx, server.Client(), server.URL)
	if err != nil {
		t.Fatalf("unexpected error executing request: %v", err)
	}
	if !success {
		t.Errorf("expected success to be true for HTTP 200")
	}
	if body != `{"status":"success","message":"ok"}` {
		t.Errorf("unexpected body content: %s", body)
	}
}

func TestExecuteRequestNon200(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"status":"error","message":"forbidden"}`))
	}))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	success, body, err := ExecuteRequest(ctx, server.Client(), server.URL)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if success {
		t.Errorf("expected success to be false for HTTP 403")
	}
	if body != `{"status":"error","message":"forbidden"}` {
		t.Errorf("unexpected body: %s", body)
	}
}

func TestExecuteRequestNetworkError(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Target a closed local port
	httpClient := &http.Client{Timeout: 500 * time.Millisecond}
	success, _, err := ExecuteRequest(ctx, httpClient, "http://127.0.0.1:54321/unreachable")
	if err == nil {
		t.Errorf("expected network error, got nil")
	}
	if success {
		t.Errorf("expected success to be false on network error")
	}
}

func TestRunDaemonCancellation(t *testing.T) {
	callCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()

	err := RunDaemon(ctx, server.Client(), server.URL, 20*time.Millisecond)
	if err != context.Canceled {
		t.Errorf("expected context.Canceled error, got %v", err)
	}
	if callCount == 0 {
		t.Errorf("expected at least 1 request to have been executed before cancel")
	}
}
