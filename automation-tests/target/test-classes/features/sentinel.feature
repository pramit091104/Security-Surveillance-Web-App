Feature: Sentinel Security Application Tests

  # Mirrors: testFirstCameraData (invocationCount = 5)
  Scenario Outline: Admin add and delete camera workflow
    Given I am on the login page
    When I login with "<email>" and "<password>"
    And I add a camera named "<cameraName>" at location "<location>"
    Then the camera "<cameraName>" should be visible on the dashboard
    When I delete the camera "<cameraName>"
    Then the camera "<cameraName>" should be removed from the dashboard

    Examples:
      | email              | password      | location   | cameraName          |
      | admin3@gmail.com   | Pr@09112004   | Front Door | Front Door Camera   |
      | admin3@gmail.com   | Pr@09112004   | Front Door | Front Door Camera   |
      | admin3@gmail.com   | Pr@09112004   | Front Door | Front Door Camera   |
      | admin3@gmail.com   | Pr@09112004   | Front Door | Front Door Camera   |
      | admin3@gmail.com   | Pr@09112004   | Front Door | Front Door Camera   |

  # Mirrors: testMultipleCameraStreaming
  Scenario: Multiple camera live streaming
    Given I am on the login page
    When I login with "admin3@gmail.com" and "Pr@09112004"
    And I add a camera named "Lobby Stream Cam" at location "Living Room"
    And I add a camera named "Backyard Cam" at location "Backyard"
    Then I should see live stream for camera "Lobby Stream Cam"
    And I should see live stream for camera "Backyard Cam"
    When I delete the camera "Lobby Stream Cam"
    And I delete the camera "Backyard Cam"

  # Mirrors: testFamilyMemberRBAC
  Scenario: Family member RBAC restrictions
    Given I am on the login page
    When I register a new family member
    And I login as the registered family member
    Then the dashboard should load
    And the Add Camera button should NOT be visible
