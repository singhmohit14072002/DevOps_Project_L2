// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy3XA9106snUi-wBy-4ZzRs4FKiYkd-Tw",
  authDomain: "blog-f7eaa.firebaseapp.com",
  projectId: "blog-f7eaa",
  storageBucket: "blog-f7eaa.firebasestorage.app",
  messagingSenderId: "921932902950",
  appId: "1:921932902950:web:07233af3a79a0e048dece7",
  measurementId: "G-GTBM92YH9V"
};

// Initialize Firebase v9 compat
// The original code used v8 syntax, we'll transition to v9 compat
firebase.initializeApp(firebaseConfig);

// Initialize services using v9 compat syntax
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authButtons = document.querySelector('.auth-buttons');
const userProfile = document.querySelector('.user-profile');
const userMenu = document.querySelector('.user-menu');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const authModal = document.getElementById('authModal');
const authTitle = document.getElementById('authModalTitle');
const nameGroupEmail = document.getElementById('nameGroupEmail');
const authSubmitEmail = document.getElementById('authSubmitEmail');
const authFormEmail = document.getElementById('authFormEmail');
const authToggleEmail = document.getElementById('authToggleEmail');

// New DOM Elements for Phone Auth
const authFormPhone = document.getElementById('authFormPhone');
const authTogglePhone = document.getElementById('authTogglePhone');
const authMethodToggles = document.querySelectorAll('.auth-method-toggle .toggle-button');
const phoneNameInput = document.getElementById('phone-name-input');
const phoneRoleInput = document.getElementById('phone-role-input');
const phoneInput = document.getElementById('phone-input');
const sendOtpButton = document.getElementById('send-otp-button');
const recaptchaContainer = document.getElementById('recaptcha-container');
const otpInput = document.getElementById('otp-input');
const verifyOtpButton = document.getElementById('verify-otp-button');

// References for user info display (if you want to show Name and Role after phone login)
const userInfoDiv = document.getElementById('user-info'); // Assuming you have this element
const displayNameSpan = document.getElementById('display-name'); // Assuming you have this element
const displayRoleSpan = document.getElementById('display-role'); // Assuming you have this element
const signOutButton = document.getElementById('sign-out-button'); // Assuming you have this element

const writePostBtn = document.getElementById('writePostBtn');
const blogPosts = document.getElementById('blogPosts');
const editorModal = document.getElementById('editorModal');
const postForm = document.getElementById('postForm');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const searchInput = document.getElementById('searchInput');

// Pagination variables
const postsPerPage = 9; // Number of posts per page
let lastVisiblePost = null; // To track the last post for the next page
let firstVisiblePost = null; // To track the first post for the previous page
let currentPage = 1;

// Global Variables
let currentUserData = null; // Initialize as null, fetch will populate

// Firebase Phone Auth Variables
let confirmationResult = null; // To store the confirmation result
let recaptchaVerifier = null; // To store the recaptcha verifier instance

// Auth state observer
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        console.log("User signed in:", user.uid);
        if (authButtons) authButtons.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex'; // Show the profile area
        
        // Populate header avatar immediately
        if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
        if (userName) userName.textContent = user.displayName || user.email; // Fallback for header span if needed
        
        if (authModal) authModal.style.display = 'none';
        
        // Fetch current user's full data and populate dropdown
        fetchCurrentUserData(); 
        
    } else {
        // User is signed out
        console.log("User signed out");
        if (authButtons) authButtons.style.display = 'flex';
        if (userProfile) userProfile.style.display = 'none'; // Hide profile area
        currentUserData = null; // Clear user data on sign out
        // Hide dropdown if it was open
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) dropdown.classList.remove('active');

        // Reset auth modal to default (email sign-in view)
        showAuthModal('signin'); // Show email sign-in form by default
    }
});

// Auth Modal Functions
function showAuthModal(type) {
    if (!authModal) {
        console.error("Auth modal not found");
        return;
    }
    
    authModal.style.display = 'flex';

    // Determine if it's signup based on the currently active form
    const isSignUp = authFormEmail.style.display !== 'none' && authTitle.textContent === 'Sign Up';

    if (type === 'signup') {
        authTitle.textContent = 'Sign Up';
        authSubmitEmail.textContent = 'Sign Up'; // Update email form button
        nameGroupEmail.style.display = 'flex'; // Show name for email signup
        authToggleEmail.style.display = 'block';
        authTogglePhone.style.display = 'none';
    } else {
        authTitle.textContent = 'Sign In';
        authSubmitEmail.textContent = 'Sign In'; // Update email form button
        nameGroupEmail.style.display = 'none'; // Hide name for email signin
         authToggleEmail.style.display = 'block';
         authTogglePhone.style.display = 'none';
    }

    // Ensure the correct form is visible based on the active toggle button
    // Fix: Use Array.from() or forEach as NodeList might not have .find()
    const activeMethodButton = Array.from(authMethodToggles).find(btn => btn.classList.contains('active'));
    if (activeMethodButton) {
         const method = activeMethodButton.dataset.method;
         if (method === 'email') {
             authFormEmail.style.display = 'block';
             authFormPhone.style.display = 'none';
             authToggleEmail.style.display = isSignUp ? 'block' : 'block'; // Show signup/signin toggle for email
             authTogglePhone.style.display = 'none'; // Hide back link for phone
         } else if (method === 'phone') {
             authFormEmail.style.display = 'none';
             authFormPhone.style.display = 'block';
             authToggleEmail.style.display = 'none'; // Hide signup/signin toggle for email
              authTogglePhone.style.display = 'block'; // Show back link for phone
              authTitle.textContent = 'Sign In with Mobile'; // Update title for phone method

              // Initialize Recaptcha when the phone form is shown
              if (!recaptchaVerifier) {
                   setupRecaptcha();
              }
         }
    }
}

function closeAuthModal() {
    if (authModal) {
        authModal.style.display = 'none';
        // Optional: Reset forms and state when closing
        authFormEmail.reset();
        // Reset phone form and hide OTP/Verify if visible
        phoneNameInput.value = '';
        phoneRoleInput.value = '';
        phoneInput.value = '';
        otpInput.value = '';
        otpInput.disabled = true;
        verifyOtpButton.disabled = true;
        sendOtpButton.disabled = true; // Disable send until recaptcha ready again
        // Reset Recaptcha if it was rendered
         if (recaptchaVerifier) {
             recaptchaVerifier.clear();
             recaptchaVerifier = null; // Clear the instance
             // Recaptcha will be set up again when phone form is shown next
         }
         confirmationResult = null; // Clear confirmation result

        // Reset to email login view by default for next open
        authMethodToggles.forEach(btn => btn.classList.remove('active'));
        document.querySelector('.auth-method-toggle .toggle-button[data-method="email"]').classList.add('active');
        authFormEmail.style.display = 'block';
        authFormPhone.style.display = 'none';
        authToggleEmail.style.display = 'block';
        authTogglePhone.style.display = 'none';
         authTitle.textContent = 'Sign In';
         nameGroupEmail.style.display = 'none';
         authSubmitEmail.textContent = 'Sign In';

    }
}

// Function to toggle between Email and Phone forms
function toggleAuthMethod(method) {
    authMethodToggles.forEach(button => {
        if (button.dataset.method === method) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    // Update form visibility and title based on selected method
    if (method === 'email') {
        authFormEmail.style.display = 'block';
        authFormPhone.style.display = 'none';
        authTitle.textContent = authSubmitEmail.textContent; // Set title based on email form state (Sign In/Sign Up)
        authToggleEmail.style.display = 'block';
        authTogglePhone.style.display = 'none';

         // Reset Recaptcha if switching away from phone form
         if (recaptchaVerifier) {
             recaptchaVerifier.clear();
             recaptchaVerifier = null;
             sendOtpButton.disabled = true; // Disable send until recaptcha ready again
         }
         confirmationResult = null; // Clear confirmation result

    } else if (method === 'phone') {
        authFormEmail.style.display = 'none';
        authFormPhone.style.display = 'block';
        authTitle.textContent = 'Sign In with Mobile';
         authToggleEmail.style.display = 'none';
         authTogglePhone.style.display = 'block';

         // Initialize Recaptcha when switching to phone form
         if (!recaptchaVerifier) {
              setupRecaptcha();
         }
    }
}

// Add event listeners to the method toggle buttons
authMethodToggles.forEach(button => {
    button.addEventListener('click', () => {
        toggleAuthMethod(button.dataset.method);
    });
});

// Auth Form Submission (Modify to handle both email and phone forms)
// Instead of one listener on authForm, add listeners to individual submit buttons/actions

// Email Form Submission (Keep existing logic, attach listener to authSubmitEmail)
if (authSubmitEmail) {
    authSubmitEmail.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent default form submission

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = document.getElementById('name')?.value;
        const isSignUp = authTitle.textContent === 'Sign Up'; // Check current modal title

        if (isSignUp) {
            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    // Signed up
                    const user = userCredential.user;
                    console.log("User created:", user);

                    // Update profile with name if provided
                    if (name) {
                        // Using v9 compat updateProfile syntax
                        user.updateProfile({
                            displayName: name
                        }).then(() => {
                            console.log("Profile updated with name:", name);
                             // After updating profile, fetch user data including name
                            fetchCurrentUserData(); // Call this to refresh user data in dropdown etc.
                        }).catch(error => {
                            console.error("Error updating profile:", error);
                             // Even if profile update fails, fetch user data based on email auth
                            fetchCurrentUserData();
                        });
                    } else {
                         // If no name provided, just fetch user data
                         fetchCurrentUserData();
                    }

                    // closeAuthModal(); // Auth state observer handles closing modal on sign-in
                })
                .catch(error => {
                    console.error("Sign up error:", error);
                    alert("Sign up failed: " + error.message);
                });
        } else {
            auth.signInWithEmailAndPassword(email, password)
                .then(userCredential => {
                    // Signed in
                    const user = userCredential.user;
                    console.log("User signed in:", user);
                    // closeAuthModal(); // Auth state observer handles closing modal on sign-in
                })
                .catch(error => {
                    console.error("Sign in error:", error);
                    alert("Sign in failed: " + error.message);
                });
        }
    });
}

// --- New Phone Authentication Logic ---

// Setup Recaptcha Verifier
// Call this function when the phone auth form is shown
function setupRecaptcha() {
     if (!recaptchaContainer) {
         console.error("Recaptcha container not found.");
         return;
     }

    // Ensure recaptchaContainer is visible if it was hidden
     recaptchaContainer.style.display = 'block';

    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(recaptchaContainer, {
        'size': 'normal', // or 'invisible' if you prefer
        'callback': (response) => {
          // reCAPTCHA solved, allow user to press send-otp-button
          console.log('Recaptcha solved.');
          sendOtpButton.disabled = false;
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          console.log('Recaptcha expired.');
          sendOtpButton.disabled = true;
          recaptchaVerifier.clear(); // Clear the expired one
           recaptchaVerifier = null; // Clear the instance
           setupRecaptcha(); // Set up a new one
        },
        'error-callback': (error) => {
            // Handle error
            console.error('Recaptcha error:', error);
            alert('Recaptcha error. Please try again.');
             sendOtpButton.disabled = true;
        }
    });

     // Render the recaptcha widget
     recaptchaVerifier.render().then(function(widgetId) {
         console.log('Recaptcha rendered with ID:', widgetId);
         // The sendOtpButton remains disabled initially until the callback is fired,
         // unless you set size to invisible and auto-execute.
     });
}

// Send OTP button click handler
if (sendOtpButton) {
    sendOtpButton.addEventListener('click', () => {
        const phoneNumber = phoneInput.value;
        if (!phoneNumber) {
            alert('Please enter a mobile number.');
            return;
        }

        // Use the Recaptcha Verifier instance
        const appVerifier = recaptchaVerifier;

        // Ensure send button is disabled to prevent multiple clicks
        sendOtpButton.disabled = true;
        verifyOtpButton.disabled = true;

        auth.signInWithPhoneNumber(phoneNumber, appVerifier)
            .then((result) => {
                // OTP sent successfully
                confirmationResult = result;
                console.log('OTP sent to', phoneNumber);
                alert('OTP sent!');
                otpInput.disabled = false;
                verifyOtpButton.disabled = false;
                 // Recaptcha is no longer needed after sending OTP successfully
                 if (recaptchaVerifier) {
                      recaptchaVerifier.clear();
                       recaptchaVerifier = null;
                        recaptchaContainer.style.display = 'none'; // Hide container
                 }
            })
            .catch((error) => {
                console.error('Error sending OTP:', error);
                alert('Error sending OTP: ' + error.message);
                 sendOtpButton.disabled = false; // Re-enable send button on error
                 verifyOtpButton.disabled = true;
                 otpInput.disabled = true;
                  // Reset recaptcha on error
                 if (recaptchaVerifier) {
                      recaptchaVerifier.clear();
                       recaptchaVerifier = null;
                       setupRecaptcha(); // Set up a new one
                 }
            });
    });
}

// Verify OTP button click handler
if (verifyOtpButton) {
    verifyOtpButton.addEventListener('click', () => {
        const otpCode = otpInput.value;
        if (!otpCode) {
            alert('Please enter the OTP.');
            return;
        }

         // Disable buttons to prevent multiple clicks during verification
         sendOtpButton.disabled = true;
         verifyOtpButton.disabled = true;
         otpInput.disabled = true;

        confirmationResult.confirm(otpCode)
            .then((result) => {
                // User signed in successfully.
                const user = result.user;
                console.log('Successfully signed in with phone number!', user);
                alert('Successfully signed in!');

                // Handle storing Name and Role
                const userName = phoneNameInput.value;
                const userRole = phoneRoleInput.value;

                if (userName || userRole) {
                    // Save Name and Role to Firestore using v9 compat syntax
                    db.collection("users").doc(user.uid).set({
                        name: userName || '',
                        role: userRole || '',
                        phoneNumber: user.phoneNumber,
                         // Add other fields if necessary, e.g., createdAt
                         createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true }) // Use merge: true to avoid overwriting existing fields if user logs in via email later
                    .then(() => {
                        console.log("User Name and Role saved/updated in Firestore!");
                         // Fetch updated user data including Name/Role for UI
                         fetchCurrentUserData(); // Call this to refresh user data in dropdown etc.
                    })
                    .catch((error) => {
                        console.error("Error saving user data:", error);
                        alert("Error saving user data: " + error.message);
                         // Still fetch user data based on auth even if Firestore save fails
                         fetchCurrentUserData();
                    });
                } else {
                     console.log("No Name or Role entered, skipping Firestore save.");
                     // Just fetch user data based on auth
                     fetchCurrentUserData();
                }

                // closeAuthModal(); // Auth state observer handles closing modal on sign-in

            }).catch((error) => {
                console.error('Error verifying OTP:', error);
                alert('Error verifying OTP: ' + error.message);
                 // Re-enable inputs and buttons on error
                 otpInput.disabled = false;
                 verifyOtpButton.disabled = false;
                 sendOtpButton.disabled = false; // User might need to request new OTP
            });
    });
}

// Sign out function (Keep existing)
function signOut() {
    auth.signOut().then(() => {
        // Sign-out successful.
        console.log('User signed out.');
        alert('Signed out.');
        // auth.onAuthStateChanged listener handles UI updates

        // Reset Auth Modal state on sign out
        // closeAuthModal(); // Calling closeAuthModal here might cause issues if auth state change also triggers UI reset
        // Let onAuthStateChanged handle showing the modal and resetting state

    }).catch((error) => {
        console.error('Error signing out:', error);
        alert('Error signing out: ' + error.message);
    });
}

// Fetch Current User Data (Enhance to get Name/Role from Firestore)
function fetchCurrentUserData() {
    const user = auth.currentUser;
    if (user) {
        // Display basic info from auth object (uid, email, phoneNumber, photoURL, displayName)
         const dropdownUserName = document.getElementById('dropdownUserName');
         const dropdownUserHandle = document.getElementById('dropdownUserHandle'); // Assuming this is for username/handle
         const dropdownUserAvatar = document.getElementById('dropdownUserAvatar'); // For dropdown avatar

        if (dropdownUserAvatar) dropdownUserAvatar.src = user.photoURL || 'https://via.placeholder.com/48';

        // Default display name/handle from auth object
        let displayUserNameText = user.displayName || user.email || user.phoneNumber || 'Anonymous';
        let displayUserHandleText = user.uid.substring(0, 8); // Use a part of UID as handle if none is available


        // Try to fetch additional data (Name, Role) from Firestore
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                console.log("User data from Firestore:", userData);
                // Prefer Name and Role from Firestore if available
                displayUserNameText = userData.name || displayUserNameText;
                displayUserHandleText = userData.role || displayUserHandleText; // Using Role as handle for simplicity

                 // Update UI elements
                 if (dropdownUserName) dropdownUserName.textContent = displayUserNameText;
                 if (dropdownUserHandle) dropdownUserHandle.textContent = displayUserHandleText;

                 // Also update header avatar/name if needed (though onAuthStateChanged might handle initial set)
                 if (userAvatar) userAvatar.src = userData.photoURL || user.photoURL || 'https://via.placeholder.com/32';
                 if (userName) userName.textContent = displayUserNameText; // Update header name

                currentUserData = userData; // Store fetched data globally

            } else {
                console.log("No user data found in Firestore for", user.uid);
                 // Update UI with just auth data if no Firestore doc
                 if (dropdownUserName) dropdownUserName.textContent = displayUserNameText;
                 if (dropdownUserHandle) dropdownUserHandle.textContent = displayUserHandleText;
                 if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
                 if (userName) userName.textContent = displayUserNameText; // Update header name
                 currentUserData = null; // Ensure global data is null if no Firestore doc
            }
        }).catch((error) => {
            console.error("Error fetching user data from Firestore:", error);
             // Update UI with just auth data on error fetching Firestore
             if (dropdownUserName) dropdownUserName.textContent = displayUserNameText;
             if (dropdownUserHandle) dropdownUserHandle.textContent = displayUserHandleText;
             if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
             if (userName) userName.textContent = displayUserNameText; // Update header name
             currentUserData = null; // Ensure global data is null on error
        });

    } else {
        // User is signed out, handle UI reset in onAuthStateChanged
        console.log("fetchCurrentUserData called but user is signed out.");
         currentUserData = null; // Ensure global data is null
         // Clear UI elements
         const dropdownUserName = document.getElementById('dropdownUserName');
         const dropdownUserHandle = document.getElementById('dropdownUserHandle');
         const dropdownUserAvatar = document.getElementById('dropdownUserAvatar');
         if (dropdownUserName) dropdownUserName.textContent = 'User Name';
         if (dropdownUserHandle) dropdownUserHandle.textContent = '@username';
         if (dropdownUserAvatar) dropdownUserAvatar.src = 'https://via.placeholder.com/48';
          if (userAvatar) userAvatar.src = 'https://via.placeholder.com/32';
          if (userName) userName.textContent = 'User Name';
    }
}

// Floating Icons (Keep existing)
function createFloatingDevOpsIcons() {
    const container = document.querySelector('.floating-icons-container');
    if (!container) return;

    // DevOps related icons (mix of brands and solid/regular)
    const icons = [
        { class: 'fa-docker', type: 'fab' }, 
        { class: 'fa-kubernetes', type: 'fab' }, 
        { class: 'fa-git-alt', type: 'fab' }, 
        { class: 'fa-aws', type: 'fab' }, 
        { class: 'fa-linux', type: 'fab' }, 
        { class: 'fa-windows', type: 'fab' }, 
        { class: 'fa-server', type: 'fas' }, 
        { class: 'fa-cloud', type: 'fas' }, 
        { class: 'fa-code-branch', type: 'fas' }, 
        { class: 'fa-cogs', type: 'fas' }, 
        { class: 'fa-terminal', type: 'fas' },
        { class: 'fa-database', type: 'fas' },
        { class: 'fa-network-wired', type: 'fas' },
        { class: 'fa-cloud-upload-alt', type: 'fas' },
        { class: 'fa-cloud-download-alt', type: 'fas' },
        { class: 'fa-microchip', type: 'fas' },
        { class: 'fa-sitemap', type: 'fas' },
        { class: 'fa-code', type: 'fas' },
        { class: 'fa-github', type: 'fab' },
        { class: 'fa-gitlab', type: 'fab' },
        { class: 'fa-jenkins', type: 'fab' },
        { class: 'fa-jira', type: 'fab' },
        { class: 'fa-digital-ocean', type: 'fab' }
    ];
    
    // Array of colors for variety (blues and teals)
    const colors = [
        'rgba(41, 98, 255, 0.3)',    // Primary blue
        'rgba(0, 119, 182, 0.3)',    // Alternative blue
        'rgba(0, 150, 199, 0.3)',    // Lighter blue
        'rgba(23, 162, 184, 0.3)',   // Teal
        'rgba(72, 202, 228, 0.3)'    // Light teal
    ];
    
    const numberOfIcons = 25; // Increased from 15 to 25

    for (let i = 0; i < numberOfIcons; i++) {
        const iconData = icons[Math.floor(Math.random() * icons.length)];
        const iconElement = document.createElement('i');
        
        // Add Font Awesome base class, specific type (fab/fas), icon class, and our custom class
        iconElement.classList.add(iconData.type, iconData.class, 'floating-icon');
        
        // Random color from our color palette
        const color = colors[Math.floor(Math.random() * colors.length)];
        iconElement.style.color = color;
        
        // Random initial position - distribute more evenly across the screen
        // Use grid-based positioning to avoid clustering
        const row = Math.floor(i / 5);  // 5 icons per row
        const col = i % 5;              // 5 columns
        
        // Add some randomness within the grid cell
        const randomOffset = 5;
        const startTop = (row * 20) + (Math.random() * randomOffset);      // 0-100% vertical in 5 rows
        const startLeft = (col * 20) + (Math.random() * randomOffset);     // 0-100% horizontal in 5 columns
        
        iconElement.style.top = `${startTop}%`;
        iconElement.style.left = `${startLeft}%`;

        // Varying sizes for more visual interest
        const sizeVariation = Math.random() * 2 + 1; // 1-3 multiplier
        iconElement.style.fontSize = `${sizeVariation * 3}rem`; // 3-9rem
        
        // Random animation duration and delay
        const duration = Math.random() * 10 + 20; // 20-30s for slower, more visible movement
        const delay = Math.random() * 10;         // 0-10s delay
        iconElement.style.animationDuration = `${duration}s`;
        iconElement.style.animationDelay = `${delay}s`;

        container.appendChild(iconElement);
    }
}

// Editor Functions
function showEditor() {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    if (editorModal && postForm) {
        // Reset the form for a new post
        postForm.reset(); 
        delete postForm.dataset.postId; // Remove any existing post ID
        delete postForm.dataset.draftId; // Remove any existing draft ID
        
        // Ensure the publish button says "Publish Post"
        const publishButton = postForm.querySelector('.publish-post');
        if (publishButton) {
            publishButton.textContent = 'Publish Post';
            publishButton.disabled = false; // Ensure it's enabled
        }
        
        // Ensure the save draft button is standard
        const saveDraftButton = postForm.querySelector('.save-draft');
        if(saveDraftButton) {
            saveDraftButton.disabled = false;
            saveDraftButton.textContent = "Save as Draft";
        }

        editorModal.style.display = 'block';
    } else {
        console.error("Editor modal or post form not found");
    }
}

function closeEditor() {
    if (editorModal) {
        editorModal.style.display = 'none';
    }
}

// Save As Draft function
function saveAsDraft() {
    if (!auth.currentUser) {
        alert("You must be signed in to save a draft.");
        return;
    }
    
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const tags = document.getElementById('postTags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
        
    if (!title && !content) {
        alert("Please add at least a title or content to save a draft.");
        return;
    }
    
    db.collection('drafts').add({
        title: title || "[No Title]",
        content: content || "",
        tags: tags,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert("Draft saved successfully!");
    })
    .catch(error => {
        console.error("Error saving draft:", error);
        alert("Error saving draft: " + error.message);
    });
}

// Show User Posts
function showUserPosts() {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    // Reset pagination when showing user posts
    currentPage = 1;
    lastVisiblePost = null;
    firstVisiblePost = null;
    if (prevPageBtn) prevPageBtn.style.display = 'none'; // Hide pagination buttons
    if (nextPageBtn) nextPageBtn.style.display = 'none';
    
    // Update UI to show loading state
    if (blogPosts) {
        blogPosts.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading your posts...</div>';
        
        // Set active filter button
        document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add a temporary page title to indicate we're viewing user posts
        const filterButtons = document.querySelector('.filter-buttons');
        if (filterButtons) {
            filterButtons.innerHTML = `
                <button class="filter-button active" data-filter="my-posts">My Posts</button>
                <button class="filter-button" data-filter="latest" onclick="loadPosts()">All Posts</button>
            `;
        }
        
        // Fetch user posts
        db.collection('posts')
            .where('authorId', '==', auth.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                blogPosts.innerHTML = '';
                
                if (snapshot.empty) {
                    blogPosts.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-pen-fancy"></i>
                            <h3>You haven't written any posts yet</h3>
                            <p>Your published posts will appear here.</p>
                            <button onclick="showEditor()" class="write-post-button">
                                <i class="fas fa-pen"></i> Write Your First Post
                            </button>
                        </div>
                    `;
                    return;
                }
                
                // Show user's posts
                snapshot.forEach(doc => {
                    const post = doc.data();
                    const postElement = createPostElement(doc.id, post, true); // true = show edit/delete buttons
                    blogPosts.appendChild(postElement);
                });
                
                // Also fetch drafts if any
                fetchUserDrafts();
                
                // Re-show pagination section but keep buttons hidden initially
                const paginationSection = document.querySelector('.pagination');
                if (paginationSection) paginationSection.style.display = 'none'; 
            })
            .catch(error => {
                console.error("Error loading user posts:", error);
                blogPosts.innerHTML = `<div class="error">Failed to load your posts: ${error.message}</div>`;
            });
    }
}

// Fetch user drafts and display them
function fetchUserDrafts() {
    if (!auth.currentUser || !blogPosts) return;
    
    db.collection('drafts')
        .where('authorId', '==', auth.currentUser.uid)
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) return;
            
            // Create a drafts section
            const draftsSection = document.createElement('div');
            draftsSection.className = 'drafts-section';
            draftsSection.innerHTML = '<h3 class="section-title">Your Drafts</h3>';
            
            snapshot.forEach(doc => {
                const draft = doc.data();
                const draftElement = document.createElement('div');
                draftElement.className = 'blog-post draft';
                draftElement.dataset.draftId = doc.id;
                
                // Format date
                let formattedDate = 'Date not available';
                if (draft.createdAt) {
                    const date = draft.createdAt.toDate();
                    formattedDate = date.toLocaleDateString();
                }
                
                draftElement.innerHTML = `
                    <div class="post-header">
                        <h2>${draft.title || "Untitled Draft"}</h2>
                        <div class="post-meta">
                            <span class="date">${formattedDate}</span>
                            <span class="draft-label">Draft</span>
                        </div>
                    </div>
                    <div class="post-content">
                        <p>${draft.content ? draft.content.substring(0, 100) : "No content yet"}${draft.content && draft.content.length > 100 ? '...' : ''}</p>
                    </div>
                    <div class="post-footer">
                        <div class="post-actions">
                            <button class="action-button edit-draft" onclick="editDraft('${doc.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="action-button delete-draft" onclick="deleteDraft('${doc.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `;
                
                draftsSection.appendChild(draftElement);
            });
            
            // Add drafts section to the blog posts container
            blogPosts.appendChild(draftsSection);
        })
        .catch(error => {
            console.error("Error loading drafts:", error);
        });
}

// Create a post element
function createPostElement(postId, post, showControls = false) {
    const postElement = document.createElement('div');
    postElement.className = 'blog-post';
    postElement.dataset.postId = postId;
    
    let formattedDate = 'Date not available';
    if (post.createdAt) {
        formattedDate = post.createdAt.toDate().toLocaleDateString();
    }
    
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    
    let postControls = '';
    if (showControls) {
        postControls = `
            <div class="post-controls">
                <button class="action-button edit-post-btn" onclick="editPost('${postId}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="action-button delete-post-btn" onclick="deletePost('${postId}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        `;
    }
    
    // Follow Button Logic (with null check)
    let followButtonHTML = '';
    if (auth.currentUser && post.authorId && auth.currentUser.uid !== post.authorId) {
        // Check if currentUserData and following array are ready
        const isFollowing = currentUserData && Array.isArray(currentUserData.following)
                            ? currentUserData.following.includes(post.authorId)
                            : false; // Default to false if not ready
        followButtonHTML = `
            <button class="action-button follow-button ${isFollowing ? 'following' : ''}" 
                    data-author-id="${post.authorId}" 
                    onclick="handleFollowClick(this, '${post.authorId}')">
                <i class="fas ${isFollowing ? 'fa-user-minus' : 'fa-user-plus'}"></i> 
                ${isFollowing ? 'Unfollow' : 'Follow'}
            </button>
        `;
    }
    
    // Bookmark Button Logic (with null check)
    let bookmarkButtonHTML = '';
    if (auth.currentUser) {
        // Check if currentUserData and bookmarkedPosts array are ready
        const isBookmarked = currentUserData && Array.isArray(currentUserData.bookmarkedPosts)
                             ? currentUserData.bookmarkedPosts.includes(postId)
                             : false; // Default to false if not ready
        bookmarkButtonHTML = `
            <button class="action-button bookmark-button ${isBookmarked ? 'bookmarked' : ''}" 
                    data-post-id="${postId}" 
                    onclick="handleBookmarkClick(this, '${postId}')">
                <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark"></i>
                 ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
        `;
    }
    
    postElement.innerHTML = `
        <div class="post-header">
            <div class="post-title-author">
                <h2>${escapeHTML(post.title)}</h2>
                <div class="post-meta">
                    <span class="author">${escapeHTML(post.authorName || 'Anonymous')}</span>
                    ${followButtonHTML}
                    <span class="date">${formattedDate}</span>
                </div>
            </div>
            ${postControls}
        </div>
        <div class="post-content">
             <p>${escapeHTML(post.content.substring(0, 200))}${post.content.length > 200 ? '...' : ''}</p>
            <a href="#" class="read-more" data-post-id="${postId}" onclick="showFullPost('${postId}'); return false;">Read More</a>
        </div>
        <div class="post-footer">
             <div class="post-tags">
                ${post.tags ? post.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('') : ''}
            </div>
            <div class="post-actions">
                 ${bookmarkButtonHTML}
                 <button class="action-button like-button" data-post-id="${postId}" onclick="likePost('${postId}')"><i class="far fa-heart"></i> ${post.likes || 0}</button>
                 <button class="action-button comment-button" data-post-id="${postId}" onclick="showComments('${postId}')"><i class="far fa-comment"></i></button>
             </div>
        </div>
    `;
    
    // Add floating icons to the post
    addFloatingIcons(postElement, post);
    
    return postElement;
}

// Function to add floating icons to a post based on its content
function addFloatingIcons(container, post) {
    // Define possible icons based on common categories
    const iconsByCategory = {
        technology: ['💻', '🖥️', '📱', '⌨️', '🔌', '🔋', '📡'],
        design: ['🎨', '✏️', '📐', '📏', '🖌️', '🖍️'],
        business: ['📈', '📊', '💼', '🏢', '💰', '📝'],
        health: ['🏥', '💊', '🩺', '🧠', '🫀', '🦷'],
        food: ['🍕', '🍔', '🥗', '🍝', '🍰', '🍎'],
        travel: ['✈️', '🚆', '🚢', '🏖️', '🏞️', '🗺️'],
        education: ['📚', '🎓', '✏️', '📝', '🔬'],
        gaming: ['🎮', '🕹️', '👾', '🎲', '♟️'],
        generic: ['✨', '💡', '🔍', '📌', '🔖', '📎']
    };
    
    // Determine which category this post matches based on tags or title
    let relevantCategories = ['generic']; // Default
    
    if (post.tags && post.tags.length > 0) {
        // Check post tags against categories
        const lowerTags = post.tags.map(tag => tag.toLowerCase());
        
        Object.keys(iconsByCategory).forEach(category => {
            if (lowerTags.includes(category) || 
                post.title.toLowerCase().includes(category) ||
                (post.content && post.content.toLowerCase().includes(category))) {
                relevantCategories.push(category);
            }
        });
    }
    
    // Get unique categories
    relevantCategories = [...new Set(relevantCategories)];
    
    // Add 3-5 random icons from relevant categories
    const iconCount = Math.floor(Math.random() * 3) + 3; // 3 to 5 icons
    
    for (let i = 0; i < iconCount; i++) {
        // Pick a random category from relevant ones
        const category = relevantCategories[Math.floor(Math.random() * relevantCategories.length)];
        const icons = iconsByCategory[category];
        
        // Pick a random icon from the category
        const icon = icons[Math.floor(Math.random() * icons.length)];
        
        // Create icon element
        const iconElement = document.createElement('span');
        iconElement.classList.add('post-icon');
        iconElement.textContent = icon;
        
        // Position randomly within the container
        iconElement.style.top = `${Math.random() * 80 + 10}%`; // 10-90%
        iconElement.style.left = `${Math.random() * 80 + 10}%`; // 10-90%
        
        // Add random size
        const sizeVariation = Math.random() * 2 + 1; // 1-3 multiplier
        iconElement.style.fontSize = `${sizeVariation * 3}rem`; // 3-9rem
        
        // Random animation duration and delay
        const duration = Math.random() * 10 + 20; // 20-30s for slower, more visible movement
        const delay = Math.random() * 10;         // 0-10s delay
        iconElement.style.animationDuration = `${duration}s`;
        iconElement.style.animationDelay = `${delay}s`;

        container.appendChild(iconElement);
    }
}

// Edit post function
function editPost(postId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    db.collection('posts').doc(postId).get()
        .then(doc => {
            if (!doc.exists) {
                alert('Post not found!');
                return;
            }
            
            const post = doc.data();
            
            // Populate the editor with post data
            document.getElementById('postTitle').value = post.title || '';
            document.getElementById('postContent').value = post.content || '';
            document.getElementById('postTags').value = post.tags ? post.tags.join(', ') : '';
            
            // Show the editor
            if (editorModal) {
                // Add post ID to the form for update reference
                postForm.dataset.postId = postId;
                
                // Change button text to reflect update rather than create
                const publishButton = postForm.querySelector('.publish-post');
                if (publishButton) {
                    publishButton.textContent = 'Update Post';
                }
                
                editorModal.style.display = 'block';
            }
        })
        .catch(error => {
            console.error("Error loading post for edit:", error);
            alert('Failed to load post for editing. Please try again.');
        });
}

// Delete post function
function deletePost(postId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        db.collection('posts').doc(postId).delete()
            .then(() => {
                alert('Post deleted successfully!');
                showUserPosts(); // Refresh the posts
            })
            .catch(error => {
                console.error("Error deleting post:", error);
                alert('Failed to delete post. Please try again.');
            });
    }
}

// Edit draft function
function editDraft(draftId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    db.collection('drafts').doc(draftId).get()
        .then(doc => {
            if (!doc.exists) {
                alert('Draft not found!');
                return;
            }
            
            const draft = doc.data();
            
            // Populate the editor with draft data
            document.getElementById('postTitle').value = draft.title || '';
            document.getElementById('postContent').value = draft.content || '';
            document.getElementById('postTags').value = draft.tags ? draft.tags.join(', ') : '';
            
            // Show the editor
            if (editorModal) {
                // Add draft ID to the form for reference
                postForm.dataset.draftId = draftId;
                
                // Ensure the publish button is visible
                const publishButton = postForm.querySelector('.publish-post');
                if (publishButton) {
                    publishButton.style.display = 'block';
                    publishButton.textContent = 'Publish';
                }
                
                editorModal.style.display = 'block';
            }
        })
        .catch(error => {
            console.error("Error loading draft for edit:", error);
            alert('Failed to load draft for editing. Please try again.');
        });
}

// Delete draft function
function deleteDraft(draftId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
        db.collection('drafts').doc(draftId).delete()
            .then(() => {
                alert('Draft deleted successfully!');
                showUserPosts(); // Refresh the posts
            })
            .catch(error => {
                console.error("Error deleting draft:", error);
                alert('Failed to delete draft. Please try again.');
            });
    }
}

// Post Form Submission (with update capabilities)
if (postForm) {
    postForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!auth.currentUser) {
            alert("You must be signed in to publish a post.");
            return;
        }
        
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const tags = document.getElementById('postTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
            
        if (!title || !content) {
            alert("Please fill in both title and content.");
            return;
        }
        
        const publishButton = document.querySelector('.publish-post');
        publishButton.disabled = true;
        publishButton.textContent = "Publishing...";
        
        // Check if we're updating an existing post
        const postId = postForm.dataset.postId;
        const draftId = postForm.dataset.draftId;
        
        let savePromise;
        
        if (postId) {
            // Update existing post
            savePromise = db.collection('posts').doc(postId).update({
                title: title,
                content: content,
                tags: tags,
                lastEdited: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // New post
            savePromise = db.collection('posts').add({
                title: title,
                content: content,
                tags: tags,
                authorId: auth.currentUser.uid,
                authorName: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                likes: 0,
                views: 0
            });
        }
        
        savePromise
            .then(() => {
                // If we published from a draft, delete the draft
                if (draftId) {
                    return db.collection('drafts').doc(draftId).delete();
                }
                return Promise.resolve();
            })
            .then(() => {
                alert(postId ? "Post updated successfully!" : "Post published successfully!");
                postForm.reset();
                // Reset the form data attributes
                delete postForm.dataset.postId;
                delete postForm.dataset.draftId;
                closeEditor();
                
                // Reset publish button text
                publishButton.textContent = "Publish Post";
                
                // Refresh the posts list
                if (postId) {
                    showUserPosts(); // If we were editing, we're likely in the My Posts view
                } else {
                    loadPosts();
                }
            })
            .catch(error => {
                console.error("Error saving post:", error);
                alert("Error: " + error.message);
            })
            .finally(() => {
                publishButton.disabled = false;
                publishButton.textContent = postId ? "Update Post" : "Publish Post";
            });
    });
}

// Load Posts (with pagination)
function loadPosts(direction = 'first') {
    if (!blogPosts || !prevPageBtn || !nextPageBtn) {
        console.error("Required elements for loading posts not found");
        return;
    }
    
    blogPosts.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';
    
    let queryRef = db.collection('posts').orderBy('createdAt', 'desc');
    
    // Build query based on direction
    if (direction === 'next' && lastVisiblePost) {
        queryRef = queryRef.startAfter(lastVisiblePost);
        currentPage++;
    } else if (direction === 'prev' && firstVisiblePost) {
        // Firestore doesn't easily support paginating backwards with 'desc' order.
        // A common workaround is fetching *before* the first visible, ordered ascending, 
        // then reversing the result. Or query descending ending before the first.
        queryRef = queryRef.endBefore(firstVisiblePost).limitToLast(postsPerPage);
        currentPage--;
    } else {
        // First page
        currentPage = 1;
        lastVisiblePost = null;
        firstVisiblePost = null;
        queryRef = queryRef.limit(postsPerPage);
    }
    
    // For 'prev', we use limitToLast. For 'first'/'next', use limit.
    if (direction !== 'prev') {
        queryRef = queryRef.limit(postsPerPage);
    }

    queryRef.get()
        .then(snapshot => {
            blogPosts.innerHTML = ''; // Clear loading/previous posts
            
            if (snapshot.empty) {
                if (currentPage === 1) {
                    blogPosts.innerHTML = '<p>No posts found. Be the first to write one!</p>';
                }
                // If not first page and empty, it means we went past the last page
                nextPageBtn.disabled = true; 
            } else {
                // Get the actual documents
                const docs = snapshot.docs;
                
                // Store the first and last visible documents for pagination
                firstVisiblePost = docs[0];
                lastVisiblePost = docs[docs.length - 1];
                
                // Display posts
                docs.forEach(doc => {
                    const post = doc.data();
                    const postElement = createPostElement(doc.id, post);
                    blogPosts.appendChild(postElement);
                });
                
                // Update button states
                // Disable next if fewer posts were fetched than the limit
                nextPageBtn.disabled = docs.length < postsPerPage;
            }
            
            // Disable previous if we are on page 1
            prevPageBtn.disabled = currentPage <= 1;
            
            // Reset filters if we navigated back to all posts
            if(document.querySelector('[data-filter="my-posts"]')) {
                 const filterButtons = document.querySelector('.filter-buttons');
                 filterButtons.innerHTML = `
                    <button class="filter-button" data-filter="my-posts" onclick="showUserPosts()">My Posts</button>
                    <button class="filter-button active" data-filter="latest">Latest</button>
                 `;
            }
        })
        .catch(error => {
            console.error("Error loading posts:", error);
            blogPosts.innerHTML = `<div class="error">Failed to load posts: ${error.message}</div>`;
        });
}

// Show full post (with null check for bookmark)
function showFullPost(postId) {
    if (!blogPosts) return;
    
    // Show loading state
    blogPosts.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading post...</div>';
    
    db.collection('posts').doc(postId).get()
        .then(doc => {
            if (!doc.exists) {
                blogPosts.innerHTML = '<div class="error">Post not found!</div>';
                return;
            }
            
            const post = doc.data();
            
            // Update view count
            db.collection('posts').doc(postId).update({
                views: firebase.firestore.FieldValue.increment(1)
            }).catch(error => console.error("Error updating view count:", error));
            
            // Create full post view
            blogPosts.innerHTML = '';
            
            const fullPostElement = document.createElement('div');
            fullPostElement.className = 'full-post';
            
            // Format date
            let formattedDate = 'Date not available';
            if (post.createdAt) {
                const date = post.createdAt.toDate();
                formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            }
            
            // Basic HTML escape function
            function escapeHTML(str) {
                if (!str) return '';
                return str
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            }
            
            // Check if current user is author
            const isAuthor = auth.currentUser && post.authorId === auth.currentUser.uid;
            
            // Add to Reading History
            addToReadingHistory(postId);
            
            // Add bookmark button to full post view as well (with null check)
            let bookmarkButtonFullHTML = '';
            if (auth.currentUser) {
                // Check if currentUserData and bookmarkedPosts array are ready
                const isBookmarked = currentUserData && Array.isArray(currentUserData.bookmarkedPosts)
                                     ? currentUserData.bookmarkedPosts.includes(postId)
                                     : false; // Default to false if not ready
                bookmarkButtonFullHTML = `
                    <button class="action-button bookmark-button ${isBookmarked ? 'bookmarked' : ''}" 
                            data-post-id="${postId}" 
                            onclick="handleBookmarkClick(this, '${postId}')">
                        <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark"></i>
                        ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
                    </button>
                `;
            }
            
            fullPostElement.innerHTML = `
                <div class="post-header">
                    <h1 class="post-title">${escapeHTML(post.title)}</h1>
                    <div class="post-meta">
                        <span class="author">${escapeHTML(post.authorName || 'Anonymous')}</span>
                        <span class="date">${formattedDate}</span>
                        <span class="views"><i class="fas fa-eye"></i> ${post.views || 0}</span>
                    </div>
                    ${isAuthor ? `
                    <div class="post-controls">
                        <button class="action-button edit-post-btn" onclick="editPost('${postId}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-button delete-post-btn" onclick="deletePost('${postId}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                    ` : ''}
                </div>
                <div class="post-content-full">
                    ${post.content.split('\n').map(paragraph => `<p>${escapeHTML(paragraph)}</p>`).join('')}
                </div>
                <div class="post-footer">
                    <div class="post-tags">
                        ${post.tags ? post.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('') : ''}
                    </div>
                    <div class="post-actions">
                        ${bookmarkButtonFullHTML}
                        <button class="action-button like-button ${post.likedBy && post.likedBy.includes(auth.currentUser?.uid) ? 'liked' : ''}" 
                                onclick="likePost('${postId}')">
                            <i class="${post.likedBy && post.likedBy.includes(auth.currentUser?.uid) ? 'fas' : 'far'} fa-heart"></i> ${post.likes || 0}
                        </button>
                        <button class="action-button comment-button" onclick="showComments('${postId}')">
                            <i class="far fa-comment"></i> Comments
                        </button>
                    </div>
                </div>
                <div class="back-button" onclick="loadPosts('first')">
                    <i class="fas fa-arrow-left"></i> Back to Posts
                </div>
                <div id="commentsSection" class="comments-section"></div>
            `;
            
            blogPosts.appendChild(fullPostElement);
            
            // Load comments for the post
            showComments(postId);
        })
        .catch(error => {
            console.error("Error loading post:", error);
            blogPosts.innerHTML = `<div class="error">Failed to load post: ${error.message}</div>`;
        });
}

// Like post function
function likePost(postId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    const userId = auth.currentUser.uid;
    
    db.collection('posts').doc(postId).get()
        .then(doc => {
            if (!doc.exists) return;
            
            const post = doc.data();
            const likedBy = post.likedBy || [];
            const isLiked = likedBy.includes(userId);
            
            if (isLiked) {
                // Unlike post
                return db.collection('posts').doc(postId).update({
                    likes: firebase.firestore.FieldValue.increment(-1),
                    likedBy: firebase.firestore.FieldValue.arrayRemove(userId)
                });
            } else {
                // Like post
                return db.collection('posts').doc(postId).update({
                    likes: firebase.firestore.FieldValue.increment(1),
                    likedBy: firebase.firestore.FieldValue.arrayUnion(userId)
                });
            }
        })
        .then(() => {
            // Refresh the current view
            const fullPostElement = document.querySelector('.full-post');
            if (fullPostElement) {
                // We're in full post view, refresh
                showFullPost(postId);
            } else {
                // We're in list view
                const likeButton = document.querySelector(`.like-button[data-post-id="${postId}"]`);
                if (likeButton) {
                    // Update UI directly without reloading
                    db.collection('posts').doc(postId).get()
                        .then(doc => {
                            if (!doc.exists) return;
                            const post = doc.data();
                            const likedBy = post.likedBy || [];
                            const isLiked = likedBy.includes(userId);
                            
                            likeButton.innerHTML = `
                                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${post.likes || 0}
                            `;
                            
                            if (isLiked) {
                                likeButton.classList.add('liked');
                            } else {
                                likeButton.classList.remove('liked');
                            }
                        });
                }
            }
        })
        .catch(error => {
            console.error("Error updating post like:", error);
        });
}

// Show comments for a post
function showComments(postId) {
    const commentsSection = document.getElementById('commentsSection');
    if (!commentsSection) return;
    
    commentsSection.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading comments...</div>';
    
    db.collection('posts').doc(postId).collection('comments')
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            commentsSection.innerHTML = `
                <h3 class="comments-title">Comments</h3>
                <div class="comments-list">
                    ${snapshot.empty ? '<p class="no-comments">No comments yet. Be the first to comment!</p>' : ''}
                </div>
                <div class="comment-form-container">
                    <form id="commentForm" class="comment-form">
                        <textarea id="commentContent" placeholder="Write your comment..." required></textarea>
                        <button type="submit" class="post-comment-btn">Post Comment</button>
                    </form>
                </div>
            `;
            
            const commentsList = commentsSection.querySelector('.comments-list');
            
            snapshot.forEach(doc => {
                const comment = doc.data();
                const commentElement = document.createElement('div');
                commentElement.className = 'comment';
                
                // Format date
                let formattedDate = 'Date not available';
                if (comment.createdAt) {
                    const date = comment.createdAt.toDate();
                    formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                }
                
                // Basic HTML escape function
                function escapeHTML(str) {
                    if (!str) return '';
                    return str
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                }
                
                commentElement.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${escapeHTML(comment.authorName || 'Anonymous')}</span>
                        <span class="comment-date">${formattedDate}</span>
                    </div>
                    <div class="comment-content">
                        ${escapeHTML(comment.content)}
                    </div>
                `;
                
                commentsList.appendChild(commentElement);
            });
            
            // Add event listener to comment form
            const commentForm = document.getElementById('commentForm');
            commentForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                if (!auth.currentUser) {
                    showAuthModal('signin');
                    return;
                }
                
                const content = document.getElementById('commentContent').value;
                if (!content.trim()) return;
                
                const submitButton = commentForm.querySelector('.post-comment-btn');
                submitButton.disabled = true;
                submitButton.textContent = 'Posting...';
                
                db.collection('posts').doc(postId).collection('comments').add({
                    content: content,
                    authorId: auth.currentUser.uid,
                    authorName: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    // Refresh comments
                    showComments(postId);
                })
                .catch(error => {
                    console.error("Error adding comment:", error);
                    alert("Failed to post comment: " + error.message);
                    submitButton.disabled = false;
                    submitButton.textContent = 'Post Comment';
                });
            });
        })
        .catch(error => {
            console.error("Error loading comments:", error);
            commentsSection.innerHTML = `<div class="error">Failed to load comments: ${error.message}</div>`;
        });
}

// Fetch Current User Data
function fetchCurrentUserData() {
    const user = auth.currentUser;
    if (user) {
        // Display basic info from auth object (uid, email, phoneNumber, photoURL, displayName)
         const dropdownUserName = document.getElementById('dropdownUserName');
         const dropdownUserHandle = document.getElementById('dropdownUserHandle'); // Assuming this is for username/handle
         const dropdownUserAvatar = document.getElementById('dropdownUserAvatar'); // For dropdown avatar

        if (dropdownUserAvatar) dropdownUserAvatar.src = user.photoURL || 'https://via.placeholder.com/48';

        // Default display name/handle from auth object
        let displayUserNameText = user.displayName || user.email || user.phoneNumber || 'Anonymous';
        let displayUserHandleText = user.uid.substring(0, 8); // Use a part of UID as handle if none is available


        // Try to fetch additional data (Name, Role) from Firestore
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                console.log("User data from Firestore:", userData);
                // Prefer Name and Role from Firestore if available
                displayUserNameText = userData.name || displayUserNameText;
                displayUserHandleText = userData.role || displayUserHandleText; // Using Role as handle for simplicity

                 // Update UI elements
                 if (dropdownUserName) dropdownUserName.textContent = displayUserNameText;
                 if (dropdownUserHandle) dropdownUserHandle.textContent = displayUserHandleText;

                 // Also update header avatar/name if needed (though onAuthStateChanged might handle initial set)
                 if (userAvatar) userAvatar.src = userData.photoURL || user.photoURL || 'https://via.placeholder.com/32';
                 if (userName) userName.textContent = displayUserNameText; // Update header name

                currentUserData = userData; // Store fetched data globally

            } else {
                console.log("No user data found in Firestore for", user.uid);
                 // Update UI with just auth data if no Firestore doc
                 if (dropdownUserName) dropdownUserName.textContent = displayUserNameText;
                 if (dropdownUserHandle) dropdownUserHandle.textContent = displayUserHandleText;
                 if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
                 if (userName) userName.textContent = displayUserNameText; // Update header name
                 currentUserData = null; // Ensure global data is null if no Firestore doc
            }
        }).catch((error) => {
            console.error("Error fetching user data from Firestore:", error);
             // Update UI with just auth data on error fetching Firestore
             if (dropdownUserName) dropdownUserName.textContent = displayUserNameText;
             if (dropdownUserHandle) dropdownUserHandle.textContent = displayUserHandleText;
             if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
             if (userName) userName.textContent = displayUserNameText; // Update header name
             currentUserData = null; // Ensure global data is null on error
        });

    } else {
        // User is signed out, handle UI reset in onAuthStateChanged
        console.log("fetchCurrentUserData called but user is signed out.");
         currentUserData = null; // Ensure global data is null
         // Clear UI elements
         const dropdownUserName = document.getElementById('dropdownUserName');
         const dropdownUserHandle = document.getElementById('dropdownUserHandle');
         const dropdownUserAvatar = document.getElementById('dropdownUserAvatar');
         if (dropdownUserName) dropdownUserName.textContent = 'User Name';
         if (dropdownUserHandle) dropdownUserHandle.textContent = '@username';
         if (dropdownUserAvatar) dropdownUserAvatar.src = 'https://via.placeholder.com/48';
          if (userAvatar) userAvatar.src = 'https://via.placeholder.com/32';
          if (userName) userName.textContent = 'User Name';
    }
}

// Handle Follow/Unfollow Click
function handleFollowClick(buttonElement, authorIdToFollow) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    if (currentUserId === authorIdToFollow) return; // Cannot follow self
    
    const userDocRef = db.collection('users').doc(currentUserId);
    const isCurrentlyFollowing = currentUserData.following.includes(authorIdToFollow);
    
    let updateAction;
    if (isCurrentlyFollowing) {
        // Unfollow
        updateAction = firebase.firestore.FieldValue.arrayRemove(authorIdToFollow);
        console.log(`Attempting to unfollow: ${authorIdToFollow}`);
    } else {
        // Follow
        updateAction = firebase.firestore.FieldValue.arrayUnion(authorIdToFollow);
        console.log(`Attempting to follow: ${authorIdToFollow}`);
    }
    
    // Disable button during update
    buttonElement.disabled = true;
    
    userDocRef.update({ following: updateAction })
        .then(() => {
            console.log("Follow status updated successfully");
            // Update local state
            if (isCurrentlyFollowing) {
                currentUserData.following = currentUserData.following.filter(id => id !== authorIdToFollow);
            } else {
                currentUserData.following.push(authorIdToFollow);
            }
            // Update button appearance immediately
            updateFollowButtonUI(buttonElement, authorIdToFollow, !isCurrentlyFollowing);
        })
        .catch(error => {
            console.error("Error updating follow status:", error);
            alert("Could not update follow status. Please try again.");
        })
        .finally(() => {
            buttonElement.disabled = false; // Re-enable button
        });
}

// Helper to Update Button UI
function updateFollowButtonUI(buttonElement, authorId, isFollowing) {
     if (!buttonElement) return;
     buttonElement.textContent = isFollowing ? ' Unfollow' : ' Follow';
     buttonElement.innerHTML = `<i class="fas ${isFollowing ? 'fa-user-minus' : 'fa-user-plus'}"></i>` + buttonElement.textContent;
     if (isFollowing) {
         buttonElement.classList.add('following');
     } else {
         buttonElement.classList.remove('following');
     }
}

// Toggle Profile Dropdown
function toggleProfileDropdown(event) {
    event.stopPropagation(); // Prevent click from bubbling up to window
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Close Dropdown on Outside Click
window.addEventListener('click', (event) => {
    const dropdown = document.getElementById('profileDropdown');
    const trigger = document.querySelector('.user-menu-trigger');
    // Close if click is outside the dropdown and not on the trigger
    if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(event.target) && !trigger.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

// Placeholder Functions for New Links
function showBookmarks() {
    if (!auth.currentUser) { showAuthModal('signin'); return; }
    if (!blogPosts) return;
    
    blogPosts.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading bookmarks...</div>';
    hidePaginationAndFilters(); // Helper function to hide common elements

    const bookmarkedIds = currentUserData.bookmarkedPosts;
    
    if (!bookmarkedIds || bookmarkedIds.length === 0) {
        blogPosts.innerHTML = '<div class="empty-state"><i class="far fa-bookmark"></i><h3>No Bookmarks Yet</h3><p>Click the bookmark icon on posts to save them here.</p></div>';
        return;
    }
    
    // Fetch bookmarked posts
    // Using multiple gets for simplicity, consider 'in' query for < 30 bookmarks
    const promises = bookmarkedIds.map(id => db.collection('posts').doc(id).get());
    
    Promise.all(promises)
        .then(docs => {
            blogPosts.innerHTML = ''; // Clear loading
             docs.forEach(doc => {
                 if (doc.exists) {
                     const post = doc.data();
                     const postElement = createPostElement(doc.id, post);
                     blogPosts.appendChild(postElement);
                 } else {
                      console.warn(`Bookmarked post with ID ${doc.id} not found.`);
                 }
             });
             if(blogPosts.children.length === 0) {
                  blogPosts.innerHTML = '<p>Could not load bookmarked posts (they may have been deleted).</p>';
             }
        })
        .catch(error => {
            console.error("Error fetching bookmarked posts:", error);
            blogPosts.innerHTML = `<div class="error">Failed to load bookmarks: ${error.message}</div>`;
        });
}

function showReadingHistory() {
    if (!auth.currentUser) { showAuthModal('signin'); return; }
    if (!blogPosts) return;
    
    blogPosts.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading reading history...</div>';
    hidePaginationAndFilters();

    const historyIds = currentUserData.readingHistory;
    
    if (!historyIds || historyIds.length === 0) {
        blogPosts.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><h3>No Reading History</h3><p>Posts you read will appear here.</p></div>';
        return;
    }
    
    // Fetch history posts - need to maintain order!
    // Fetch one by one to preserve order easily.
    blogPosts.innerHTML = ''; // Clear loading
    let postsFound = 0;
    Promise.all(historyIds.map(id => db.collection('posts').doc(id).get()))
        .then(docs => {
             docs.forEach(doc => {
                  if (doc.exists) {
                     postsFound++;
                     const post = doc.data();
                     const postElement = createPostElement(doc.id, post);
                     blogPosts.appendChild(postElement);
                  } else {
                     console.warn(`History post with ID ${doc.id} not found.`);
                  }
             });
             if (postsFound === 0) {
                 blogPosts.innerHTML = '<p>Could not load posts from history (they may have been deleted).</p>';
             }
        })
        .catch(error => {
            console.error("Error fetching history posts:", error);
            blogPosts.innerHTML = `<div class="error">Failed to load reading history: ${error.message}</div>`;
        });
}

// Helper to Hide Pagination/Filters
function hidePaginationAndFilters() {
     const paginationSection = document.querySelector('.pagination');
     const filterButtons = document.querySelector('.filter-buttons');
     if(paginationSection) paginationSection.style.display = 'none';
     if(filterButtons) filterButtons.style.display = 'none';
}

// Handle Bookmark Click (with detailed logging)
function handleBookmarkClick(buttonElement, postId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    if (!currentUserData) {
        alert("User data not loaded yet. Please wait and try again.");
        console.error("handleBookmarkClick called before currentUserData was loaded.");
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    const userDocRef = db.collection('users').doc(currentUserId);
    
    // Ensure local array exists before checking includes
    const localBookmarks = Array.isArray(currentUserData.bookmarkedPosts) ? currentUserData.bookmarkedPosts : [];
    const isCurrentlyBookmarked = localBookmarks.includes(postId);
    
    let updateAction;
    let updateData = {};

    if (isCurrentlyBookmarked) {
        updateAction = firebase.firestore.FieldValue.arrayRemove(postId);
        updateData = { bookmarkedPosts: updateAction };
        console.log(`Attempting to UNBOOKMARK: User=${currentUserId}, Post=${postId}`);
    } else {
        updateAction = firebase.firestore.FieldValue.arrayUnion(postId);
        updateData = { bookmarkedPosts: updateAction };
        console.log(`Attempting to BOOKMARK: User=${currentUserId}, Post=${postId}`);
    }
    
    console.log("Firestore update object:", updateData);
    buttonElement.disabled = true; 
    
    // Perform the update
    userDocRef.update(updateData)
        .then(() => {
            console.log("Firestore update successful for bookmark status.");
            // Update local state *after* successful Firestore update
            if (isCurrentlyBookmarked) {
                // Use the validated local array
                currentUserData.bookmarkedPosts = localBookmarks.filter(id => id !== postId);
            } else {
                // Push to the validated local array
                currentUserData.bookmarkedPosts = [...localBookmarks, postId]; // Ensure it's added correctly
            }
            console.log("Local bookmark data updated:", currentUserData.bookmarkedPosts);
            // Update button UI
            updateBookmarkButtonUI(buttonElement, !isCurrentlyBookmarked);
            const otherButtonSelector = document.querySelector(`.bookmark-button[data-post-id="${postId}"]:not([disabled])`);
            if(otherButtonSelector) updateBookmarkButtonUI(otherButtonSelector, !isCurrentlyBookmarked);
        })
        .catch(error => {
            console.error(`Error updating bookmark status for post ${postId}:`, error); // Log the specific error object
            // Provide more specific error feedback
            let userMessage = "Could not update bookmark status. Please try again.";
            if (error.code === 'permission-denied') {
                 userMessage = "Permission denied. Check Firestore rules.";
            } else if (error.code === 'not-found') {
                 userMessage = "User document not found. Cannot update bookmark.";
            } else {
                 userMessage = `Could not update bookmark status. Error: ${error.code || error.message}`; // Include error code
            }
            alert(userMessage);
        })
        .finally(() => {
            buttonElement.disabled = false; 
        });
}

// Helper to Update Bookmark Button UI
function updateBookmarkButtonUI(buttonElement, isBookmarked) {
     if (!buttonElement) return;
     buttonElement.innerHTML = `
         <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark"></i> 
         ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
     `;
     if (isBookmarked) {
         buttonElement.classList.add('bookmarked');
     } else {
         buttonElement.classList.remove('bookmarked');
     }
}

// Add to Reading History
const READING_HISTORY_LIMIT = 50; // Max posts to keep in history
function addToReadingHistory(postId) {
    if (!auth.currentUser || !postId) return;
    // Ensure user data is available before attempting transaction
    if (!currentUserData) {
         console.warn("addToReadingHistory skipped: currentUserData not loaded.");
         return;
    }

    const currentUserId = auth.currentUser.uid;
    const userDocRef = db.collection('users').doc(currentUserId);
    
    // Use the locally available history for optimistic check, transaction handles consistency
    let history = currentUserData.readingHistory || [];
    // Check if update is even needed (already at the front)
    if (history.length > 0 && history[0] === postId) {
        // console.log("Post already at front of reading history.");
        return; 
    }

    // Proceed with transaction
    db.runTransaction(transaction => {
        return transaction.get(userDocRef).then(doc => {
            // Re-fetch within transaction for consistency
            if (!doc.exists) throw "User document does not exist!"; 
            const data = doc.data();
            let currentHistory = data.readingHistory || []; 
            currentHistory = currentHistory.filter(id => id !== postId);
            currentHistory.unshift(postId);
            if (currentHistory.length > READING_HISTORY_LIMIT) {
                currentHistory = currentHistory.slice(0, READING_HISTORY_LIMIT);
            }
            transaction.update(userDocRef, { readingHistory: currentHistory });
            return currentHistory; // Return new history to update local state
        });
    }).then((newHistory) => {
        console.log(`Added/updated post ${postId} in reading history.`);
        // Update local data AFTER successful transaction
        currentUserData.readingHistory = newHistory;
    }).catch(error => {
        console.error("Error updating reading history transaction:", error);
    });
}

// Show Account Settings
function showAccountSettings() {
    alert("Account Settings feature coming soon!");
}

// Show Changelog
function showChangelog() {
    alert("Changelog feature coming soon!");
}

// Show Support
function showSupport() {
    alert("Support & Feedback feature coming soon!");
}

// Add scroll listener for header animation
window.addEventListener('scroll', function() {
    const header = document.querySelector('.main-header');
    if (window.scrollY > 50) { // Add shadow after scrolling 50px
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});
