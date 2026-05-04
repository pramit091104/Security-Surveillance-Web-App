package com.sentinel.runners;

import io.cucumber.testng.AbstractTestNGCucumberTests;
import io.cucumber.testng.CucumberOptions;

@CucumberOptions(
    features = "src/test/resources/features/sentinel.feature",
    glue    = {"com.sentinel.steps", "com.sentinel.hooks"},
    plugin  = {"pretty"},
    monochrome = true
)
public class TestRunner extends AbstractTestNGCucumberTests {
    // TestNG drives Cucumber via AbstractTestNGCucumberTests
}
