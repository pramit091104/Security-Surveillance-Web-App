package com.sentinel.steps;

import com.sentinel.hooks.TestHooks;
import io.cucumber.java.en.*;
import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.FluentWait;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.Wait;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;

import java.time.Duration;

public class SentinelSteps {

    private WebDriver getDriver() {
        return TestHooks.driver.get();
    }

    private WebDriverWait getWait() {
        return TestHooks.wait.get();
    }

    // Tracks the registered family member credentials across steps
    private static String familyEmail;
    private static String familyPwd = "familysecure123";

    // -----------------------------------------------------------------------
    // GIVEN
    // -----------------------------------------------------------------------

    @Given("I am on the login page")
    public void i_am_on_the_login_page() {
        // Already navigated in @Before hook
        System.out.println("On login page: " + getDriver().getCurrentUrl());
    }

    // -----------------------------------------------------------------------
    // WHEN
    // -----------------------------------------------------------------------

    @When("I login with {string} and {string}")
    public void i_login_with(String email, String password) {
        WebElement emailField = getWait().until(ExpectedConditions.visibilityOfElementLocated(By.id("username")));
        emailField.clear();
        emailField.sendKeys(email);

        getDriver().findElement(By.id("password")).sendKeys(password);

        getWait().until(ExpectedConditions.elementToBeClickable(By.id("loginBtn"))).click();
    }

    @When("I add a camera named {string} at location {string}")
    public void i_add_a_camera(String cameraName, String location) {
        // FluentWait for the Add Camera button — same as original addCameraModule()
        Wait<WebDriver> fluentWait = new FluentWait<>(getDriver())
                .withTimeout(Duration.ofSeconds(15))
                .pollingEvery(Duration.ofMillis(500))
                .ignoring(NoSuchElementException.class);

        fluentWait.until(d -> d.findElement(By.id("addCameraBtn"))).click();

        WebElement camNameInput = getWait().until(ExpectedConditions.visibilityOfElementLocated(By.id("cameraName")));
        camNameInput.sendKeys(cameraName);

        Select locationSelect = new Select(getDriver().findElement(By.id("cameraLocation")));
        locationSelect.selectByVisibleText(location);

        getDriver().findElement(By.id("saveCamera")).click();
    }

    @When("I delete the camera {string}")
    public void i_delete_the_camera(String cameraName) {
        By deleteBtnLocator = By.xpath(
            "//h3[text()='" + cameraName + "']/ancestor::div[contains(@class,'group')]//button[@id='deleteCameraBtn']"
        );
        getWait().until(ExpectedConditions.elementToBeClickable(deleteBtnLocator)).click();

        // Handle native alert if present — same as original deleteCameraAndHandleAlerts()
        try {
            Alert alert = getDriver().switchTo().alert();
            System.out.println("Alert intercepted: " + alert.getText());
            alert.accept();
        } catch (NoAlertPresentException e) {
            System.out.println("No native alert. Deletion succeeded or custom modal used.");
        }

        // Window & frame handling — same as original demoWindowAndFrameHandling()
        String originalWindow = getDriver().getWindowHandle();
        for (String handle : getDriver().getWindowHandles()) {
            if (!originalWindow.equals(handle)) {
                getDriver().switchTo().window(handle);
                getDriver().close();
            }
        }
        getDriver().switchTo().window(originalWindow);

        if (!getDriver().findElements(By.tagName("iframe")).isEmpty()) {
            getDriver().switchTo().frame(0);
            getDriver().switchTo().defaultContent();
        }
    }

    @When("I register a new family member")
    public void i_register_a_new_family_member() {
        familyEmail = "family" + System.currentTimeMillis() + "@sentinel.com";

        // Switch to registration form
        getDriver().findElement(By.xpath("//button[contains(text(),'Sign up')]")).click();

        // Fill registration form
        WebElement nameInput = getWait().until(
            ExpectedConditions.visibilityOfElementLocated(By.xpath("//input[@placeholder='John Doe']"))
        );
        nameInput.sendKeys("Test Family Member");

        Select roleSelect = new Select(getDriver().findElement(By.xpath("//select[.//option[@value='FamilyMember']]")));
        roleSelect.selectByVisibleText("Family Member");

        getDriver().findElement(By.id("username")).sendKeys(familyEmail);
        getDriver().findElement(By.id("password")).sendKeys(familyPwd);

        getDriver().findElement(By.id("loginBtn")).click();

        // Wait for success message
        getWait().until(ExpectedConditions.visibilityOfElementLocated(
            By.xpath("//h2[contains(text(),'Welcome Back')]")
        ));

        // Refresh to reset React form state — same as original
        getDriver().navigate().refresh();
    }

    @When("I login as the registered family member")
    public void i_login_as_the_registered_family_member() {
        i_login_with(familyEmail, familyPwd);
    }

    // -----------------------------------------------------------------------
    // THEN
    // -----------------------------------------------------------------------

    @Then("the camera {string} should be visible on the dashboard")
    public void camera_should_be_visible(String cameraName) {
        By locator = By.xpath("//h3[text()='" + cameraName + "']");
        boolean isAdded = getWait().until(ExpectedConditions.presenceOfAllElementsLocatedBy(locator)).size() > 0;
        Assert.assertTrue(isAdded, "Camera was not correctly added: " + cameraName);
    }

    @Then("the camera {string} should be removed from the dashboard")
    public void camera_should_be_removed(String cameraName) {
        By locator = By.xpath("//h3[text()='" + cameraName + "']");
        boolean isGone = getWait().until(ExpectedConditions.invisibilityOfElementLocated(locator));
        Assert.assertTrue(isGone, "Camera was not removed: " + cameraName);
    }

    @Then("I should see live stream for camera {string}")
    public void i_should_see_live_stream(String cameraName) {
        By viewBtnLocator = By.xpath(
            "//h3[text()='" + cameraName + "']/ancestor::div[contains(@class,'group')]//button[@id='viewCameraBtn']"
        );
        getWait().until(ExpectedConditions.elementToBeClickable(viewBtnLocator)).click();

        // Wait for modal header
        By modalHeader = By.xpath(
            "//h3[contains(text(),'Live Feed') and contains(text(),'" + cameraName + "')]"
        );
        getWait().until(ExpectedConditions.visibilityOfElementLocated(modalHeader));

        // Assert video element is rendered
        boolean videoPresent = getWait().until(
            ExpectedConditions.presenceOfElementLocated(By.tagName("video"))
        ).isDisplayed();
        Assert.assertTrue(videoPresent, "Video stream did not render for: " + cameraName);

        // Close modal
        getDriver().findElement(By.xpath("//h3[contains(text(),'Live Feed')]/../../button")).click();

        // Wait for modal to disappear before next interaction
        getWait().until(ExpectedConditions.invisibilityOfElementLocated(modalHeader));
    }

    @Then("the dashboard should load")
    public void the_dashboard_should_load() {
        getWait().until(ExpectedConditions.visibilityOfElementLocated(
            By.xpath("//h2[text()='Active Cameras']")
        ));
    }

    @Then("the Add Camera button should NOT be visible")
    public void add_camera_button_should_not_be_visible() {
        boolean isAddBtnPresent = !getDriver().findElements(By.id("addCameraBtn")).isEmpty();
        Assert.assertFalse(isAddBtnPresent,
            "Security Failure: FamilyMember role should NOT see the Add Camera button!");
    }
}
