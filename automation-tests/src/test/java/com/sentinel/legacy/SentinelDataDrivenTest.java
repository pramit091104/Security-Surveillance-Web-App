package com.sentinel.legacy;

import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.FluentWait;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.Wait;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;
import org.testng.annotations.*;

import java.time.Duration;

public class SentinelDataDrivenTest {

    private WebDriver driver;
    private WebDriverWait explicitWait;

    // Data stored internally to safely drive inputs per logic block
    private String[][] cameraData = {
        {"admin3@gmail.com", "Pr@09112004", "Front Door", "Front Door Camera"},
        {"admin3@gmail.com", "Pr@09112004", "Garage", "Garage Cam HD"}
    };

    // --- SETUP & TEARDOWN ---

    @BeforeClass
    public void beforeClass() {
        System.out.println("@BeforeClass: Class Setup - Preparing test environment & WebDriver.");
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--use-fake-ui-for-media-stream");
        options.addArguments("--use-fake-device-for-media-stream");
        options.addArguments("--disable-notifications");
        
        driver = new ChromeDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
        driver.manage().window().maximize();
        
        explicitWait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @BeforeMethod
    public void beforeMethod() {
        System.out.println("@BeforeMethod: Method Setup - Navigating to default app URL before test execution.");
        driver.get("http://localhost:3000/login"); 
    }

    // --- TESTS ---
    
    @Test(priority = 1, invocationCount = 5) // Simple linear load/stress testing!
    public void testFirstCameraData() {
        System.out.println("@Test: Testing Admin Add/Delete workflow (Row 1)");
        String[] data = cameraData[0];
        runEndToEndLogic(data[0], data[1], data[2], data[3]);
    }
    
    @Test(priority = 2)
    public void testMultipleCameraStreaming() {
        System.out.println("@Test: Verifying multiple cameras rendering and sequential Live Streaming capabilities");
        
        // 1. Initial Login
        loginModule("admin3@gmail.com", "Pr@09112004");
        
        // 2. Configure two dynamic cameras together on the dashboard
        String cam1Name = "Lobby Stream Cam";
        String cam2Name = "Backyard Cam";
        addCameraModule(cam1Name, "Living Room");
        addCameraModule(cam2Name, "Backyard");

        // 3. Test Live Feed Access for Cam 1
        verifyLiveStreamForCamera(cam1Name);

        // 4. Test Live Feed Access for Cam 2
        verifyLiveStreamForCamera(cam2Name);

        // 5. System Cleanup
        deleteCameraAndHandleAlerts(cam1Name);
        deleteCameraAndHandleAlerts(cam2Name);
    }

    private void verifyLiveStreamForCamera(String cameraName) {
        // Find the specific card and click 'View Live'
        By viewBtnLocator = By.xpath("//h3[text()='" + cameraName + "']/ancestor::div[contains(@class, 'group')]//button[@id='viewCameraBtn']");
        explicitWait.until(ExpectedConditions.elementToBeClickable(viewBtnLocator)).click();
        
        // Wait for the modal header to appear
        By modalHeader = By.xpath("//h3[contains(text(), 'Live Feed') and contains(text(), '" + cameraName + "')]");
        explicitWait.until(ExpectedConditions.visibilityOfElementLocated(modalHeader));
        
        // Assert the video stream node is actively rendered
        boolean videoPresent = explicitWait.until(ExpectedConditions.presenceOfElementLocated(By.tagName("video"))).isDisplayed();
        Assert.assertTrue(videoPresent, "Video stream did not render correctly for " + cameraName);
        
        // Click the Close (X) button next to the modal header
        driver.findElement(By.xpath("//h3[contains(text(), 'Live Feed')]/../../button")).click();
        
        // Wait for modal to cleanly vanish before interacting with the next stream
        explicitWait.until(ExpectedConditions.invisibilityOfElementLocated(modalHeader));
    }

    @Test(priority = 3)
    public void testFamilyMemberRBAC() {
        System.out.println("@Test: Testing Registration and Role-Based Access Control (RBAC) restrictions");
        String familyEmail = "family" + System.currentTimeMillis() + "@sentinel.com";
        String familyPwd = "familysecure123";

        // 1. Switch to Registration
        driver.findElement(By.xpath("//button[contains(text(), 'Sign up')]")).click();

        // 2. Fill Registration Form
        WebElement nameInput = explicitWait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//input[@placeholder='John Doe']")));
        nameInput.sendKeys("Test Family Member");

        Select roleSelect = new Select(driver.findElement(By.xpath("//select[.//option[@value='FamilyMember']]")));
        roleSelect.selectByVisibleText("Family Member");

        driver.findElement(By.id("username")).sendKeys(familyEmail);
        driver.findElement(By.id("password")).sendKeys(familyPwd);

        // 3. Submit Registration
        driver.findElement(By.id("loginBtn")).click();

        // 4. Wait for Registration Success and switch to Login
        explicitWait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//h2[contains(text(), 'Welcome Back')]")));
        
        // 5. Refresh page to reset React's form state, preventing credential duplication
        driver.navigate().refresh();
        
        // 6. Login as FamilyMember
        loginModule(familyEmail, familyPwd);

        // 6. Navigate/Wait for Dashboard to render implicitly
        explicitWait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//h2[text()='Active Cameras']")));

        // 7. Verify RBAC Restricts Adding Cameras
        boolean isAddBtnPresent = !driver.findElements(By.id("addCameraBtn")).isEmpty();
        Assert.assertFalse(isAddBtnPresent, "Security Failure: FamilyMember role should NOT see the Add Camera button!");
    }

    @AfterMethod
    public void afterMethod() {
        System.out.println("@AfterMethod: Method Teardown - Clearing LocalStorage to mock session expiry.");
        // Clear session so the next @Test starts fresh on the login screen
        ((JavascriptExecutor) driver).executeScript("window.localStorage.clear();");
    }

    @AfterClass
    public void afterClass() {
        System.out.println("@AfterClass: Class Teardown - Quitting WebDriver.");
        if (driver != null) {
            driver.quit(); 
        }
    }


    // --- MODULAR WORKFLOWS ---
    private void runEndToEndLogic(String email, String password, String location, String cameraName) {
        loginModule(email, password);
        addCameraModule(cameraName, location);
        deleteCameraAndHandleAlerts(cameraName);
    }

    private void loginModule(String email, String pwd) {
        WebElement emailField = explicitWait.until(ExpectedConditions.visibilityOfElementLocated(By.id("username")));
        emailField.clear();
        emailField.sendKeys(email); 
        
        driver.findElement(By.id("password")).sendKeys(pwd);
        
        WebElement loginBtn = explicitWait.until(ExpectedConditions.elementToBeClickable(By.id("loginBtn")));
        loginBtn.click();
    }

    private void addCameraModule(String cameraName, String locationValue) {
        Wait<WebDriver> fluentWait = new FluentWait<>(driver)
                .withTimeout(Duration.ofSeconds(15))
                .pollingEvery(Duration.ofMillis(500))
                .ignoring(NoSuchElementException.class);

        WebElement addBtn = fluentWait.until(d -> d.findElement(By.id("addCameraBtn")));
        addBtn.click();

        WebElement camNameInput = explicitWait.until(ExpectedConditions.visibilityOfElementLocated(By.id("cameraName")));
        camNameInput.sendKeys(cameraName);

        Select locationSelect = new Select(driver.findElement(By.id("cameraLocation")));
        locationSelect.selectByVisibleText(locationValue);

        driver.findElement(By.id("saveCamera")).click();

        By dynamicLocator = By.xpath("//h3[text()='" + cameraName + "']");
        boolean isAdded = explicitWait.until(ExpectedConditions.presenceOfAllElementsLocatedBy(dynamicLocator)).size() > 0;
        Assert.assertTrue(isAdded, "Camera was not correctly added!");
    }

    private void deleteCameraAndHandleAlerts(String cameraName) {
        By deleteBtnLocator = By.xpath("//h3[text()='" + cameraName + "']/ancestor::div[contains(@class, 'group')]//button[@id='deleteCameraBtn']");
        WebElement deleteBtn = explicitWait.until(ExpectedConditions.elementToBeClickable(deleteBtnLocator));
        deleteBtn.click();
        
        try {
            Alert alert = driver.switchTo().alert();
            System.out.println("Alert intercepted: " + alert.getText());
            alert.accept(); 
        } catch (NoAlertPresentException e) {
            System.out.println("No native alert popped up. Deletion succeeded or custom modal was used.");
        }
        
        demoWindowAndFrameHandling();
    }
    
    private void demoWindowAndFrameHandling() {
        String originalWindow = driver.getWindowHandle();
        for (String windowHandle : driver.getWindowHandles()) {
            if (!originalWindow.contentEquals(windowHandle)) {
                driver.switchTo().window(windowHandle);
                driver.close();
            }
        }
        driver.switchTo().window(originalWindow); 
        
        if (driver.findElements(By.tagName("iframe")).size() > 0) {
            driver.switchTo().frame(0); 
            driver.switchTo().defaultContent(); 
        }
    }
}
