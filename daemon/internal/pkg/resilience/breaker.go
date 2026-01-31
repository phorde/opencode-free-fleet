package resilience

import (
	"errors"
	"fmt"
	"time"

	"github.com/sony/gobreaker"
)

type ProviderBreaker struct {
	breaker *gobreaker.CircuitBreaker
}

func NewProviderBreaker(name string) *ProviderBreaker {
	settings := gobreaker.Settings{
		Name:        name,
		MaxRequests: 3,
		Interval:    30 * time.Second,
		Timeout:     30 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 3 && failureRatio >= 0.6
		},
	}

	return &ProviderBreaker{
		breaker: gobreaker.NewCircuitBreaker(settings),
	}
}

func (b *ProviderBreaker) Execute(req func() (interface{}, error)) (interface{}, error) {
	result, err := b.breaker.Execute(req)
	if err != nil {
		if errors.Is(err, gobreaker.ErrOpenState) {
			return nil, fmt.Errorf("circuit breaker open for %s", b.breaker.Name())
		}
		return nil, err
	}
	return result, nil
}
