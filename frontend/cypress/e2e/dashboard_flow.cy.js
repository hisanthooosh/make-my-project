describe('Student Dashboard Navigation', () => {

  // This runs BEFORE every single test block below
  beforeEach(() => {
    // 1. Set screen size to a standard Laptop (1280x720) to fix sidebar issues
    cy.viewport(1280, 720);

    // 2. Visit the app
    cy.visit('http://localhost:3000');
    cy.wait(2000); // Give it a moment to load

    // 3. SMART CHECK: Are we already logged in?
    cy.get('body').then(($body) => {
        // If the text "Logout" is found, click it to reset
        if ($body.text().includes('Logout')) {
            cy.contains('Logout').click();
            cy.wait(2000); // Wait for the Login Page to appear
        }
    });

    // 4. Login Process
    // Ensure we are on the login page before typing
    cy.get('input[type="email"]').should('be.visible').type('h@gmail.com'); 
    cy.get('input[type="password"]').type('h@gmail.com'); // <--- PUT REAL PASSWORD HERE
    cy.contains('button', 'Sign In').click();
    
    // 5. Wait for dashboard to load completely
    cy.wait(4000); 
  });

  // TEST 1: Check Sidebar Navigation
  it('should navigate to Weekly Overview', () => {
    // Verify we are not on the login page anymore
    cy.url().should('not.include', 'login');

    // Click 'Weekly Overview' (using force: true just in case it's hidden)
    cy.contains('Weekly Overview').click({ force: true });

    // Verify the content changed (Look for specific text 'Week')
    cy.get('body').should('contain', 'Week'); 
  });

  // TEST 2: Check Download Button
  it('should have a working Download PDF button', () => {
    // Verify "Download PDF" button exists
    cy.contains('Download PDF').should('be.visible');

    // Verify it is not disabled (clickable)
    cy.contains('Download PDF').should('not.be.disabled');

    // Click it to ensure it triggers (doesn't crash)
    cy.contains('Download PDF').click();
  });

});