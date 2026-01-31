package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/phorde/opencode-free-fleet/daemon/internal/service"
)

var oracle *service.MetadataOracle

func InitOracle() {
	oracle = service.NewMetadataOracle()
}

func GetModel(c *gin.Context) {
	modelID := c.Param("id")
	if modelID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "model id required"})
		return
	}

	if meta, ok := oracle.GetMetadata(modelID); ok {
		c.JSON(http.StatusOK, meta)
		return
	}

	meta, err := oracle.FetchRemoteMetadata(modelID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "model not found or unavailable"})
		return
	}

	c.JSON(http.StatusOK, meta)
}
