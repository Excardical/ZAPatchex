<h3>A work in progress, Final Year Project</h3>
<div align="center">
<img src="/public/OWASP_ZAP_Logo.png" alt="OWASP ZAP Logo">
<h1>ZAP Auth Helper</h1>
<h3>A ZAP Add-on to simplify and automate authenticated web scanning.</h3>

<h5>
Tired of manually configuring authentication scripts? This add-on provides a user-friendly interface to set up complex authentication flows, so you can focus on finding vulnerabilities, not fighting with session management. 🛡️
<br/>
It's built to work seamlessly within your existing ZAP workflow.
</h5>

</div>

Table of Contents

    Introduction

    Features

    Installation

    Getting Started

    Documentation

Introduction <a name="introduction"></a>

ZAP Auth Helper is an add-on for OWASP ZAP designed to streamline the process of configuring authenticated scans. It provides a dedicated UI panel to manage authentication strategies like form-based login, JSON Web Tokens (JWT), and OAuth 2.0, complete with automatic token detection, session verification, and script generation.

This add-on is perfect for security professionals and developers who regularly perform authenticated scans and want a faster, more reliable way to handle user sessions.

Features <a name="features"></a>

    Intuitive UI: A dedicated tab in ZAP for configuring all authentication settings. No more manual scripting for common scenarios!

    Multiple Auth Methods: Out-of-the-box support for:

        Form-based authentication

        JSON Web Tokens (JWT), including automatic refresh token handling

        OAuth 2.0 flows

    Auto-Detection: Automatically detects login forms and JWTs in HTTP traffic to suggest configurations.

    Session Verification: Define logged-in/logged-out patterns to ensure ZAP's scanner remains authenticated throughout the scan.

    Context-Aware: Easily apply and manage different authentication configurations for different ZAP Contexts.

    Import/Export: Save and load your authentication configurations to reuse across projects.

Installation <a name="installation"></a>
(In Progress...)
Prerequisites

    OWASP ZAP version 2.12.0 or newer.

From the ZAP Marketplace (Recommended)

    In ZAP, click the Manage Add-ons button (marketplace icon).

    Select the Marketplace tab.

    Find "Auth Helper" in the list and click Install.

    Restart ZAP when prompted.

Manual Installation

    Download the latest .zap file from the Releases page.

    In ZAP, go to File > Load Add-on file....

    Select the downloaded .zap file and click Open.

    ZAP will install the add-on and prompt for a restart.

Getting Started <a name="getting-started"></a> 
(In Progress...)
Once installed, the Auth Helper is ready to use.

Configure a New Authenticated Context

    Define a Context: Make sure the target application is included in a ZAP Context. You can create one by right-clicking the site in the Sites Tree and selecting Include in Context > New Context.

    Open Auth Helper: Navigate to the Auth Helper tab located in the bottom panel of the ZAP UI.

    Select Context and Strategy:

        From the dropdown menu, choose the Context you want to configure.

        Click "Add New Strategy" and select the authentication type (e.g., "Form-based Authentication").

    Fill in the Details:

        The add-on will prompt for necessary information, such as the Login Page URL, POST data parameters, username, and password. For JWTs, it will ask for token locations.

        Use the "Auto-Detect" feature to try and populate these fields automatically from your proxied traffic.

    Verify the Setup:

        Define a "Logged-in Indicator" (e.g., the presence of a "Logout" button on a page) so the add-on can verify the session is active.

        Click the "Test" button. The add-on will attempt to log in and report its success or failure in the output panel.

    Enable and Scan: Once verification is successful, check the "Enable for Context" box. Now, when you run an Active Scan or Spider against this Context, ZAP will automatically handle authentication. ✅

Documentation <a name="documentation"></a>

This add-on leverages core ZAP functionalities. For more advanced use cases, the following resources are helpful:

    OWASP ZAP User Guide

    ZAP Authentication and Session Management

    ZAP Scripting Documentation
