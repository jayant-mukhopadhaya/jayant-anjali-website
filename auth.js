// Client-side "password checking" script
// Checks if the session storage has the specific key.
if (!sessionStorage.getItem('wedding_auth')) {
    // If not authenticated, send them to the login page, remembering
    // which page (and section) they asked for so the login can bring
    // them straight back to it, e.g. a shared link to invite.html.
    // replace() keeps this page out of history, so Back from the login
    // page doesn't bounce them here again.
    var wanted = window.location.pathname.split('/').pop() || 'index.html';
    window.location.replace('login.html?next=' + encodeURIComponent(wanted + window.location.hash));
}
