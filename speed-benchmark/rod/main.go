package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
)

const targetURL = "https://toolsummary.com/submit-ai-tool/"

var testData = map[string]string{
	"name":        "Speed Test User",
	"email":       "speedtest@example.com",
	"toolUrl":     "https://example-speed-test.com",
	"category":    "AI Assistant",
	"pricing":     "Free",
	"description": "Benchmark test submission for browser automation speed comparison. This tool provides AI-powered features for productivity enhancement.",
}

var selectors = map[string]string{
	"name":             "#wpforms-148-field_0",
	"email":            "#wpforms-148-field_1",
	"toolUrl":          "#wpforms-148-field_3",
	"category":         "#wpforms-148-field_5",
	"pricingContainer": ".choices[data-type=\"select-one\"]",
	"pricingDropdown":  ".choices__list--dropdown",
	"description":      "#wpforms-148-field_2",
	"submit":           "#wpforms-submit-148",
}

type FormFillMetrics struct {
	Name        float64 `json:"name"`
	Email       float64 `json:"email"`
	ToolUrl     float64 `json:"toolUrl"`
	Category    float64 `json:"category"`
	Pricing     float64 `json:"pricing"`
	Description float64 `json:"description"`
}

type TimingMetrics struct {
	BrowserLaunch   float64         `json:"browserLaunch"`
	PageNavigation  float64         `json:"pageNavigation"`
	FormFill        FormFillMetrics `json:"formFill"`
	SubmitClick     float64         `json:"submitClick"`
	TotalFormFill   float64         `json:"totalFormFill"`
	TotalTest       float64         `json:"totalTest"`
	TotalWithLaunch float64         `json:"totalWithLaunch"`
}

type BenchmarkRun struct {
	Tool      string        `json:"tool"`
	Mode      string        `json:"mode"`
	Iteration int           `json:"iteration"`
	Timestamp string        `json:"timestamp"`
	Metrics   TimingMetrics `json:"metrics"`
	Success   bool          `json:"success"`
	Error     string        `json:"error,omitempty"`
}

func measureTime(fn func()) float64 {
	start := time.Now()
	fn()
	return float64(time.Since(start).Milliseconds())
}

func runBenchmark(iteration int, headless bool) BenchmarkRun {
	mode := "headed"
	if headless {
		mode = "headless"
	}

	result := BenchmarkRun{
		Tool:      "rod",
		Mode:      mode,
		Iteration: iteration,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Success:   false,
	}

	var browser *rod.Browser
	var page *rod.Page

	defer func() {
		if r := recover(); r != nil {
			result.Error = fmt.Sprintf("%v", r)
		}
		if browser != nil {
			browser.MustClose()
		}
	}()

	// Measure browser launch
	result.Metrics.BrowserLaunch = measureTime(func() {
		l := launcher.New().Headless(headless)
		url := l.MustLaunch()
		browser = rod.New().ControlURL(url).MustConnect()
	})

	page = browser.MustPage("")

	// Measure page navigation
	result.Metrics.PageNavigation = measureTime(func() {
		page.MustNavigate(targetURL).MustWaitLoad()
	})

	// Measure form fills
	result.Metrics.FormFill.Name = measureTime(func() {
		page.MustElement(selectors["name"]).MustInput(testData["name"])
	})

	result.Metrics.FormFill.Email = measureTime(func() {
		page.MustElement(selectors["email"]).MustInput(testData["email"])
	})

	result.Metrics.FormFill.ToolUrl = measureTime(func() {
		page.MustElement(selectors["toolUrl"]).MustInput(testData["toolUrl"])
	})

	result.Metrics.FormFill.Category = measureTime(func() {
		page.MustElement(selectors["category"]).MustInput(testData["category"])
	})

	// Handle Choices.js dropdown
	result.Metrics.FormFill.Pricing = measureTime(func() {
		// Click to open dropdown
		page.MustElement(selectors["pricingContainer"]).MustClick()
		// Wait for dropdown
		page.MustElement(selectors["pricingDropdown"]).MustWaitVisible()
		// Click the option
		optionSelector := fmt.Sprintf(".choices__item--choice[data-value=\"%s\"]", testData["pricing"])
		page.MustElement(optionSelector).MustClick()
	})

	result.Metrics.FormFill.Description = measureTime(func() {
		page.MustElement(selectors["description"]).MustInput(testData["description"])
	})

	// Calculate total form fill
	result.Metrics.TotalFormFill = result.Metrics.FormFill.Name +
		result.Metrics.FormFill.Email +
		result.Metrics.FormFill.ToolUrl +
		result.Metrics.FormFill.Category +
		result.Metrics.FormFill.Pricing +
		result.Metrics.FormFill.Description

	// Measure submit click
	result.Metrics.SubmitClick = measureTime(func() {
		page.MustElement(selectors["submit"]).MustClick()
	})

	result.Metrics.TotalTest = result.Metrics.PageNavigation +
		result.Metrics.TotalFormFill +
		result.Metrics.SubmitClick

	result.Metrics.TotalWithLaunch = result.Metrics.BrowserLaunch + result.Metrics.TotalTest

	result.Success = true
	return result
}

func main() {
	iteration := 0
	headless := true

	if len(os.Args) > 1 {
		iteration, _ = strconv.Atoi(os.Args[1])
	}
	if len(os.Args) > 2 {
		headless = os.Args[2] == "true"
	}

	result := runBenchmark(iteration, headless)

	jsonBytes, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(jsonBytes))

	// Also write to file
	mode := "headless"
	if !headless {
		mode = "headed"
	}
	filename := fmt.Sprintf("../results/rod-%s-%d.json", mode, iteration)
	os.WriteFile(filename, jsonBytes, 0644)
}
