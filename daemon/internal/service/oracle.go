package service

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"github.com/phorde/opencode-free-fleet/daemon/internal/pkg/resilience"
)

type MetadataOracle struct {
	cache    map[string]ModelMetadata
	mu       sync.RWMutex
	breakers map[string]*resilience.ProviderBreaker
}

type ModelMetadata struct {
	ID         string `json:"id"`
	Provider   string `json:"provider"`
	Tier       string `json:"tier"`
	Confidence int    `json:"confidence"`
}

func NewMetadataOracle() *MetadataOracle {
	return &MetadataOracle{
		cache:    make(map[string]ModelMetadata),
		breakers: make(map[string]*resilience.ProviderBreaker),
	}
}

func (o *MetadataOracle) GetMetadata(modelID string) (ModelMetadata, bool) {
	o.mu.RLock()
	defer o.mu.RUnlock()
	meta, ok := o.cache[modelID]
	return meta, ok
}

func (o *MetadataOracle) SaveCache() error {
	o.mu.RLock()
	defer o.mu.RUnlock()

	home, _ := os.UserHomeDir()
	path := filepath.Join(home, ".config", "opencode", "cache", "metadata.json")

	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	return encoder.Encode(o.cache)
}
