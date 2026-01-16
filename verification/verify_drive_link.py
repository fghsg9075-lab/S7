from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 1. Login as Admin and set valid Google Drive wallpaper
    print("Navigating to login as Admin...")
    page.goto("http://localhost:5173/login")
    try:
        page.wait_for_selector('input[placeholder="Email"]', timeout=5000)
        page.fill('input[placeholder="Email"]', "admin@admin.com")
        page.fill('input[placeholder="Password"]', "password123")
        page.click('button:has-text("Login")')
        page.wait_for_selector('text="Chats"', timeout=15000)
        print("Admin Login successful.")
    except Exception as e:
        print(f"Admin Login failed: {e}. Skipping wallpaper set.")
        # Try to proceed anyway if we are logged in from previous session? No, browser is new.
        # If admin doesn't exist, we might fail.
        return
    
    time.sleep(2)
    
    # Set Wallpaper with a Drive Link
    # Example Drive Link format: https://drive.google.com/file/d/123456789/view
    drive_link = "https://drive.google.com/file/d/123456789/view?usp=sharing"
    
    try:
        if page.get_by_text("Admin Controls").is_visible():
            page.get_by_text("Admin Controls").click()
            time.sleep(1)
            
            # Fill URL
            page.fill('input[placeholder="https://..."]', drive_link)
            # Check if preview logic triggered? (It relies on state update)
            time.sleep(1)
            
            # Save
            page.click('button:has-text("Save Settings")')
            time.sleep(2)
            
            # Close
            page.get_by_text("✕").click()
            print("Wallpaper set with Drive Link.")
    except Exception as e:
        print(f"Setting wallpaper failed: {e}")

    # 2. Go to Chat
    print("Navigating to chat...")
    page.goto("http://localhost:5173/chat/some-user-id")
    time.sleep(3)
    
    # 3. Check if Background has the converted link
    # The div style should have the converted url: https://drive.google.com/uc?export=view&id=123456789
    # We can check by taking a screenshot or checking attributes.
    # Note: Since '123456789' is fake, the image won't actually load visually, but the URL should be correct in DOM.
    
    page.screenshot(path="verification/wallpaper_drive_fix.png")
    print("Screenshot taken.")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
