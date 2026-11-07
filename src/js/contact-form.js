/**
 * Client-Side Contact Form Validation & Character Limit Engine
 * Accessible, zero-dependency, progressive enhancement.
 */
(function() {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var nameInput = document.getElementById('name');
  var emailInput = document.getElementById('email');
  var subjectInput = document.getElementById('subject');
  var bodyInput = document.getElementById('body');
  var charCount = document.getElementById('char-count');
  var charCounter = document.getElementById('char-counter');
  var submitBtn = document.getElementById('submit-btn');
  var statusBox = document.getElementById('form-status');

  var MAX_MESSAGE_CHARS = 1000;
  var MIN_MESSAGE_CHARS = 10;
  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function isFormValid() {
    var nameVal = nameInput ? nameInput.value.trim() : '';
    var emailVal = emailInput ? emailInput.value.trim() : '';
    var bodyVal = bodyInput ? bodyInput.value.trim() : '';

    var isNameOk = nameVal.length >= 2;
    var isEmailOk = EMAIL_REGEX.test(emailVal);
    var isBodyOk = bodyVal.length >= MIN_MESSAGE_CHARS && bodyVal.length <= MAX_MESSAGE_CHARS;

    return isNameOk && isEmailOk && isBodyOk;
  }

  function updateSubmitState() {
    if (!submitBtn) return;
    if (isFormValid()) {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('disabled');
      submitBtn.classList.remove('is-disabled');
    } else {
      submitBtn.disabled = true;
      submitBtn.setAttribute('disabled', 'disabled');
      submitBtn.classList.add('is-disabled');
    }
  }

  function updateCharCount() {
    if (!bodyInput || !charCount || !charCounter) return;
    var len = bodyInput.value.length;
    charCount.textContent = len;

    if (len >= MAX_MESSAGE_CHARS) {
      charCounter.classList.add('is-max');
      charCounter.classList.remove('is-approaching');
    } else if (len >= MAX_MESSAGE_CHARS * 0.9) {
      charCounter.classList.add('is-approaching');
      charCounter.classList.remove('is-max');
    } else {
      charCounter.classList.remove('is-max', 'is-approaching');
    }
  }

  function setError(input, errorEl, message) {
    if (!input || !errorEl) return;
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    errorEl.textContent = message;
    errorEl.classList.add('is-visible');
  }

  function clearError(input, errorEl) {
    if (!input || !errorEl) return;
    input.classList.remove('is-invalid');
    input.setAttribute('aria-invalid', 'false');
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
  }

  function validateName() {
    var err = document.getElementById('name-error');
    var val = nameInput.value.trim();
    if (!val) {
      setError(nameInput, err, 'Please enter your name.');
      return false;
    }
    if (val.length < 2) {
      setError(nameInput, err, 'Name must be at least 2 characters.');
      return false;
    }
    clearError(nameInput, err);
    return true;
  }

  function validateEmail() {
    var err = document.getElementById('email-error');
    var val = emailInput.value.trim();
    if (!val) {
      setError(emailInput, err, 'Please enter your email address.');
      return false;
    }
    if (!EMAIL_REGEX.test(val)) {
      setError(emailInput, err, 'Please enter a valid email address (e.g. name@example.com).');
      return false;
    }
    clearError(emailInput, err);
    return true;
  }

  function validateBody() {
    var err = document.getElementById('body-error');
    var val = bodyInput.value.trim();
    if (!val) {
      setError(bodyInput, err, 'Please enter a message.');
      return false;
    }
    if (val.length < MIN_MESSAGE_CHARS) {
      setError(bodyInput, err, 'Message must be at least ' + MIN_MESSAGE_CHARS + ' characters.');
      return false;
    }
    if (val.length > MAX_MESSAGE_CHARS) {
      setError(bodyInput, err, 'Message exceeds limit of ' + MAX_MESSAGE_CHARS + ' characters.');
      return false;
    }
    clearError(bodyInput, err);
    return true;
  }

  // Real-time character counter & submit state updates
  if (bodyInput) {
    bodyInput.addEventListener('input', function() {
      updateCharCount();
      updateSubmitState();
      if (bodyInput.classList.contains('is-invalid')) {
        validateBody();
      }
    });
    bodyInput.addEventListener('blur', function() {
      if (bodyInput.value.trim().length > 0) validateBody();
      updateSubmitState();
    });
  }

  if (nameInput) {
    nameInput.addEventListener('input', function() {
      updateSubmitState();
      if (nameInput.classList.contains('is-invalid')) validateName();
    });
    nameInput.addEventListener('blur', function() {
      if (nameInput.value.trim().length > 0) validateName();
      updateSubmitState();
    });
  }

  if (emailInput) {
    emailInput.addEventListener('input', function() {
      updateSubmitState();
      if (emailInput.classList.contains('is-invalid')) validateEmail();
    });
    emailInput.addEventListener('blur', function() {
      if (emailInput.value.trim().length > 0) validateEmail();
      updateSubmitState();
    });
  }

  // Initial state check
  updateCharCount();
  updateSubmitState();

  // Form submission handler
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    var isNameValid = validateName();
    var isEmailValid = validateEmail();
    var isBodyValid = validateBody();
    updateSubmitState();

    if (!isNameValid || !isEmailValid || !isBodyValid) {
      var firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    var action = form.getAttribute('action') || 'mailto:hello@junaith.dev';
    var recipient = action.replace(/^mailto:/i, '') || 'hello@junaith.dev';
    var subjectVal = (subjectInput ? subjectInput.value.trim() : '') || ('New inquiry from ' + nameInput.value.trim());
    var bodyVal = bodyInput.value.trim() + '\n\n---\nSender: ' + nameInput.value.trim() + '\nEmail: ' + emailInput.value.trim();

    var mailtoUrl = 'mailto:' + encodeURIComponent(recipient) +
                    '?subject=' + encodeURIComponent(subjectVal) +
                    '&body=' + encodeURIComponent(bodyVal);

    if (statusBox) {
      statusBox.textContent = 'Opening your email client... If it does not launch automatically, you can write directly to ' + recipient + '.';
      statusBox.classList.add('is-visible', 'form-status-success');
    }

    window.location.href = mailtoUrl;
  });
})();
