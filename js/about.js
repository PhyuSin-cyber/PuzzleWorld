function handleSubmit(event) {
    event.preventDefault();
    
    // Get form and message elements
    const form = document.getElementById('contactForm');
    const formMessage = document.getElementById('formMessage');
    
    // Show success message
    formMessage.textContent = 'Thank you for your message! We\'ll get back to you soon.';
    formMessage.style.color = '#4CAF50';
    formMessage.style.display = 'block';
    
    // Reset the form
    form.reset();
    
    // Hide message after 5 seconds
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
    
    return false;
}

// Add form validation
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
});