// Client-side "password checking" script
// Checks if the session storage has the specific key.
if (!sessionStorage.getItem('wedding_auth')) {
    // If not authenticated, redirect to login page
    // We use window.location.pathname to avoid redirect loops if already on login page
    // (though this script shouldn't be included on login.html anyway)

    // Slight handling for local development vs production pathing might be needed
    // but assuming flat structure:
    window.location.href = "login.html";
}
