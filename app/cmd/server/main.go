package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/spiffe/go-spiffe/v2/spiffetls/tlsconfig"
	"github.com/spiffe/go-spiffe/v2/workloadapi"

	"zerokey-demo/pkg/config"
	"zerokey-demo/pkg/server"
	"zerokey-demo/pkg/spiffe"
)

func main() {
	log.Println("==================================================")
	log.Println("  🔒 Starting SPIFFE-Enabled Backend API Server   ")
	log.Println("==================================================")

	cfg := config.LoadServerConfig()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Parse allowed client SPIFFE ID
	allowedClientID, err := spiffe.ParseID(cfg.AllowedClientURI)
	if err != nil {
		log.Fatalf("❌ Failed to parse allowed client SPIFFE ID: %v", err)
	}

	log.Printf("Connecting to SPIFFE Workload API at %s...", cfg.SocketPath)

	// Retry connecting to Workload API until agent is ready
	var source *workloadapi.X509Source
	for {
		source, err = workloadapi.NewX509Source(
			ctx,
			workloadapi.WithClientOptions(workloadapi.WithAddr(cfg.SocketPath)),
		)
		if err == nil {
			break
		}
		log.Printf("⏳ Workload API not available yet (%v). Retrying in 2 seconds...", err)
		time.Sleep(2 * time.Second)
	}
	defer source.Close()

	// Inspect server SVID
	svid, err := source.GetX509SVID()
	if err != nil {
		log.Fatalf("❌ Failed to fetch default X.509 SVID: %v", err)
	}
	log.Printf("✅ Server SVID acquired successfully!")
	log.Printf("   ├─ Server SPIFFE ID: %s", svid.ID.String())
	log.Printf("   ├─ Trust Domain:     %s", svid.ID.TrustDomain().String())
	log.Printf("   └─ Cert Expires:     %s", svid.Certificates[0].NotAfter.Format(time.RFC3339))

	// Configure mTLS authorizer
	authorizer := tlsconfig.AuthorizeID(allowedClientID)
	tlsConfig := tlsconfig.MTLSServerConfig(source, source, authorizer)

	mux := server.NewMux(svid.ID.String())

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      mux,
		TLSConfig:    tlsConfig,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	// Graceful shutdown handling
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("🚀 Server listening for mTLS connections on port %s...", cfg.Port)
		log.Printf("   └─ Authorized Client ID: %s", allowedClientID.String())
		if err := httpServer.ListenAndServeTLS("", ""); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Server error: %v", err)
		}
	}()

	<-stop
	log.Println("🛑 Shutting down backend API server gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("Error during shutdown: %v", err)
	}
	log.Println("👋 Server stopped.")
}
