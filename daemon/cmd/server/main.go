package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/phorde/opencode-free-fleet/daemon/internal/api"
)

func main() {
	// Setup Gin
	r := gin.Default()

	// Setup Routes
	api.SetupRoutes(r)

	// Server Config
	srv := &http.Server{
		Addr:    ":3456",
		Handler: r,
	}

	// Start Server
	go func() {
		log.Printf("🚀 Fleet Intelligence Daemon starting on port 3456...")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown: ", err)
	}

	log.Println("Server exiting")
}
