package com.sentinel.hooks;

import io.cucumber.java.After;
import io.cucumber.java.Before;
import io.cucumber.java.BeforeAll;
import io.cucumber.java.AfterAll;
import io.cucumber.java.Scenario;
import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.Duration;

public class TestHooks {

    // Shared across all steps in a scenario via ThreadLocal
    public static ThreadLocal<WebDriver> driver = new ThreadLocal<>();
    public static ThreadLocal<WebDriverWait> wait = new ThreadLocal<>();

    @BeforeAll
    public static void beforeAll() {
        System.out.println("@BeforeAll: Setting up WebDriverManager.");
        WebDriverManager.chromedriver().setup();
    }

    @Before
    public void before(Scenario scenario) {
        System.out.println("@Before: Starting scenario - " + scenario.getName());

        ChromeOptions options = new ChromeOptions();
        options.addArguments("--use-fake-ui-for-media-stream");
        options.addArguments("--use-fake-device-for-media-stream");
        options.addArguments("--disable-notifications");

        WebDriver webDriver = new ChromeDriver(options);
        webDriver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
        webDriver.manage().window().maximize();

        driver.set(webDriver);
        wait.set(new WebDriverWait(webDriver, Duration.ofSeconds(10)));

        // Navigate to login page before each scenario
        webDriver.get("http://localhost:3000/login");
    }

    @After
    public void after(Scenario scenario) {
        System.out.println("@After: Tearing down scenario - " + scenario.getName());

        WebDriver webDriver = driver.get();
        if (webDriver != null) {
            // Clear localStorage to mock session expiry (same as original @AfterMethod)
            ((JavascriptExecutor) webDriver).executeScript("window.localStorage.clear();");
            webDriver.quit();
            driver.remove();
            wait.remove();
        }
    }

    @AfterAll
    public static void afterAll() {
        System.out.println("@AfterAll: Cleaning up test users from database.");
        clearTestUsersFromDB();
    }

    // Clears only test-generated family member accounts from the DB
    private static void clearTestUsersFromDB() {
        String dbUrl = "jdbc:sqlite:../security.db";
        String sql = "DELETE FROM users WHERE email LIKE 'family%@sentinel.com'";

        try {
            Class.forName("org.sqlite.JDBC");
            try (Connection conn = DriverManager.getConnection(dbUrl);
                 PreparedStatement stmt = conn.prepareStatement(sql)) {
                int deleted = stmt.executeUpdate();
                System.out.println("DB Cleanup: Removed " + deleted + " test user(s).");
            }
        } catch (ClassNotFoundException | SQLException e) {
            System.err.println("DB Cleanup failed: " + e.getMessage());
        }
    }
}
