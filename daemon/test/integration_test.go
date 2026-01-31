package main

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/phorde/opencode-free-fleet/daemon/internal/api"
	"github.com/phorde/opencode-free-fleet/daemon/internal/service"
)

func TestHealthCheck(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	r := gin.New()
	api.SetupRoutes(r)

	// Start server in goroutine
	srv := &http.Server{
		Addr:    ":3457", // Test port
		Handler: r,
	}

	go func() {
		srv.ListenAndServe()
	}()
	defer srv.Shutdown(context.Background())

	// Wait for server start
	time.Sleep(100 * time.Millisecond)

	// Test Health Endpoint
	resp, err := http.Get("http://localhost:3457/api/v1/health")
	if err != nil {
		t.Fatalf("Health check failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

func TestMetadataOracle_FetchRemote(t *testing.T) {
	oracle := service.NewMetadataOracle()

	if oracle == nil {
		t.Fatal("Oracle should not be nil")
	}
}
