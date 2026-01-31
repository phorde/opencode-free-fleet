package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type ModelsDevResponse struct {
	Data []struct {
		ID      string `json:"id"`
		Pricing struct {
			Prompt     string `json:"prompt"`
			Completion string `json:"completion"`
		} `json:"pricing"`
	} `json:"data"`
}

func (o *MetadataOracle) FetchRemoteMetadata(modelID string) (*ModelMetadata, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("https://models.dev/api/v1/models")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("models.dev api returned %d", resp.StatusCode)
	}

	var data ModelsDevResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	for _, m := range data.Data {
		if m.ID == modelID {
			isFree := m.Pricing.Prompt == "0" && m.Pricing.Completion == "0"
			tier := "CONFIRMED_PAID"
			confidence := 70
			if isFree {
				tier = "CONFIRMED_FREE"
				confidence = 100
			}

			return &ModelMetadata{
				ID:         m.ID,
				Provider:   "models.dev",
				Tier:       tier,
				Confidence: confidence,
			}, nil
		}
	}

	return nil, fmt.Errorf("model not found")
}
