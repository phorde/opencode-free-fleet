package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	InitOracle()
	v1 := r.Group("/api/v1")
	{
		v1.GET("/health", HealthCheck)
		v1.GET("/models/:id", GetModel)
	}
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
		"service":   "opencode-free-fleet-daemon",
		"version":   "0.6.0",
	})
}
