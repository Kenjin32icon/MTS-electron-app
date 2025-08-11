// DOM elements
const loginToggle = document.getElementById('login-toggle');
const signupToggle = document.getElementById('signup-toggle');
const authForm = document.getElementById('auth-form');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');
const nameField = document.getElementById('name-field');
const passwordConfirmField = document.getElementById('password-confirm-field');
const authFeedback = document.getElementById('auth-feedback');
const submitBtn = document.getElementById('submit-btn');
const authSuccess = document.getElementById('auth-success');
const successMessage = document.getElementById('success-message');
const loadingSpinner = document.getElementById('loading-spinner'); // Assuming you have a loading spinner element

let isLoginMode = true; // Renamed from isLogin for clarity with the example

// Toggle between login and signup
loginToggle.addEventListener('click', () => {
  if (isLoginMode) return;
  toggleForms(true);
});

signupToggle.addEventListener('click', () => {
  if (!isLoginMode) return;
  toggleForms(false);
});

function toggleForms(showLogin) {
  isLoginMode = showLogin;
  loginToggle.classList.toggle('active', showLogin);
  loginToggle.classList.toggle('text-gray-800', showLogin);
  loginToggle.classList.toggle('text-gray-500', !showLogin);
  signupToggle.classList.toggle('active', !showLogin);
  signupToggle.classList.toggle('text-gray-800', !showLogin);
  signupToggle.classList.toggle('text-gray-500', showLogin);

  nameField.classList.toggle('hidden', showLogin);
  passwordConfirmField.classList.toggle('hidden', showLogin);

  if (showLogin) {
    formTitle.textContent = 'Welcome Back';
    formSubtitle.textContent = 'Please sign in to your account';
    submitBtn.textContent = 'Sign In';
  } else {
    formTitle.textContent = 'Create Account';
    formSubtitle.textContent = 'Get started with your account today';
    submitBtn.textContent = 'Sign Up';
  }

  authFeedback.classList.add('hidden');
  authSuccess.classList.add('hidden');
}

// Form submission
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  authFeedback.classList.add('hidden'); // Hide previous errors
  authSuccess.classList.add('hidden'); // Hide previous success
  loadingSpinner.classList.remove('hidden'); // Show loading spinner

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const name = isLoginMode ? null : document.getElementById('name').value;
  const passwordConfirm = isLoginMode ? null : document.getElementById('password-confirm').value;

  // Client-side validation
  // Assuming validateEmail function exists elsewhere or is added
  // if (!validateEmail(email)) {
  //     showError('Please enter a valid email address.');
  //     loadingSpinner.classList.add('hidden');
  //     return;
  // }

  if (password.length < 6) {
    showError('Password must be at least 6 characters long.');
    loadingSpinner.classList.add('hidden');
    return;
  }

  if (!isLoginMode && password !== passwordConfirm) {
    showError('Passwords do not match');
    loadingSpinner.classList.add('hidden');
    return;
  }

  try {
    let result;
    if (isLoginMode) {
      // Use window.electronAPI.login for sign-in
      result = await window.electronAPI.login({ email, password });
    } else {
      // Use window.electronAPI.register for sign-up
      result = await window.electronAPI.register({ name, email, password });
    }

    if (result.success) {
      successMessage.textContent = isLoginMode ? 'Signed in successfully! Redirecting...' : 'Account created successfully! Please check your email to confirm.';
      authSuccess.classList.remove('hidden');
      authForm.reset(); // Clear form fields on success

      // Store simulated user info in localStorage (as per original example's intent)
      localStorage.setItem('loggedInUser', JSON.stringify(result.user));

      // Simulate redirection based on role or success
      setTimeout(() => {
        if (result.user && result.user.role === 'admin') {
          window.location.href = 'admin.html';
        } else if (result.user && result.user.role === 'client') {
          window.location.href = 'clientportal.html';
        } else if (isLoginMode) {
          window.location.href = 'index.html'; // Default redirect for login
        } else {
          // After successful registration, switch to login mode and pre-fill email
          toggleForms(true);
          document.getElementById('email').value = email;
        }
      }, 1500); // Short delay for success message to show

    } else {
      showError(result.message || 'An unknown error occurred.');
    }
  } catch (err) {
    console.error('Authentication error:', err);
    showError('An unexpected error occurred. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
    loadingSpinner.classList.add('hidden'); // Hide loading spinner
  }
});

function showError(message) {
  authFeedback.textContent = message;
  authFeedback.classList.remove('hidden');
  submitBtn.disabled = false;
  submitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
}

function showSuccess(message) {
  successMessage.textContent = message;
  authSuccess.classList.remove('hidden');
  // authForm.reset(); // Resetting form is handled within the submit listener now
}

// Initial form setup
document.addEventListener('DOMContentLoaded', () => {
  toggleForms(true); // Set initial mode to login
});
