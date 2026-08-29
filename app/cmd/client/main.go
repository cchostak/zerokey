package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/spiffe/go-spiffe/v2/spiffetls/tlsconfig"
	"github.com/spiffe/go-spiffe/v2/workloadapi"

	"zerokey-demo/pkg/client"
	"zerokey-demo/pkg/config"
	"zerokey-demo/pkg/spiffe"
)

func main() {
	onceFlag := flag.Bool("once", false, "Execute a single request and exit with status code")
	flag.Parse()

	log.Println("==================================================")
	log.Println("  🔑 Starting SPIFFE-Enabled Client Worker        ")
	log.Println("==================================================")

	cfg := config.LoadClientConfig(*onceFlag)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	expectedServerID, err := spiffe.ParseID(cfg.ExpectedServerID)
	if err != nil {
		log.Fatalf("❌ Failed to parse expected server SPIFFE ID: %v", err)
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
		log.Printf("⏳ Workload API not ready (%v). Retrying in 2 seconds...", err)
		time.Sleep(2 * time.Second)
	}
	defer source.Close()

	// Inspect client SVID
	svid, err := source.GetX509SVID()
	if err != nil {
		log.Fatalf("❌ Failed to fetch default client X.509 SVID: %v", err)
	}
	log.Printf("✅ Client SVID acquired successfully!")
	log.Printf("   ├─ Client SPIFFE ID: %s", svid.ID.String())
	log.Printf("   ├─ Trust Domain:     %s", svid.ID.TrustDomain().String())
	log.Printf("   └─ Cert Expires:     %s", svid.Certificates[0].NotAfter.Format(time.RFC3339))

	// Configure mTLS authorizer
	authorizer := tlsconfig.AuthorizeID(expectedServerID)
	tlsConfig := tlsconfig.MTLSClientConfig(source, source, authorizer)

	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
		Timeout: 10 * time.Second,
	}

	if cfg.RunOnce {
		success, _, _ := client.ExecuteRequest(ctx, httpClient, cfg.ServerURL)
		if !success {
			os.Exit(1)
		}
		log.Println("✅ Single-shot test completed successfully!")
		return
	}

	// Handle graceful termination in daemon mode
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	daemonCtx, daemonCancel := context.WithCancel(ctx)
	go func() {
		<-stop
		daemonCancel()
	}()

	_ = client.RunDaemon(daemonCtx, httpClient, cfg.ServerURL, 10*time.Second)
}
