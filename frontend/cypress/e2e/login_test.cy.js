describe('Login Functionality', () => {
  
  it('Logs in with valid credentials', () => {
    // 1. Visit the page
    cy.visit('http://localhost:3000');
    
    // 2. Check if we are on the login page
    cy.contains('Welcome Back!').should('be.visible');

    // 3. Find the Email box and type
    // We look for the input that has type="email"
    cy.get('input[type="email"]').type('h@gmail.com');

    // 4. Find the Password box and type
    // We look for the input that has type="password"
    cy.get('input[type="password"]').type('h@gmail.com');

    // 5. Click the "Sign In" button
    cy.contains('button', 'Sign In').click();

    // 6. Wait for Firebase to verify and redirect
    cy.wait(4000); // Giving it 4 seconds to think

    // 7. Verify we moved to the dashboard
    // Checks if the URL is NO LONGER the login page, or checks for a dashboard element
    cy.url().should('not.include', 'login');
    // OR look for something that only appears after login (like "Dashboard" or "Logout")
    // cy.contains('Dashboard').should('be.visible'); 
  });

});