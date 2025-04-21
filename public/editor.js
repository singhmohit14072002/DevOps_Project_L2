// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app;
try {
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
    document.body.innerHTML = '<div class="error-message">Failed to initialize the application. Please try again later.</div>';
}

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.log('The current browser does not support persistence.');
        }
    });

// DOM Elements
const publishButton = document.getElementById('publishButton');
const saveDraftButton = document.getElementById('saveDraftButton');
const postTitle = document.getElementById('postTitle');
const postContent = document.getElementById('postContent');
const postTags = document.getElementById('postTags');
const postImage = document.getElementById('postImage');

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = '/blog.html';
    }
}, (error) => {
    console.error('Auth state change error:', error);
    document.body.innerHTML = '<div class="error-message">Failed to initialize authentication. Please try again later.</div>';
});

// Handle publish button click
publishButton.addEventListener('click', async () => {
    try {
        const user = auth.currentUser;
        if (!user) {
            window.location.href = '/blog.html';
            return;
        }

        const title = postTitle.value.trim();
        const content = postContent.value.trim();
        const tags = postTags.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        const image = postImage.value.trim();

        if (!title || !content) {
            alert('Please fill in the title and content');
            return;
        }

        const postData = {
            title,
            content,
            tags,
            image: image || null,
            author: {
                uid: user.uid,
                name: user.displayName,
                photoURL: user.photoURL
            },
            status: 'published',
            publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            comments: []
        };

        await db.collection('posts').add(postData);
        window.location.href = '/blog.html';
    } catch (error) {
        console.error('Error publishing post:', error);
        alert('Failed to publish post. Please try again.');
    }
});

// Handle save draft button click
saveDraftButton.addEventListener('click', async () => {
    try {
        const user = auth.currentUser;
        if (!user) {
            window.location.href = '/blog.html';
            return;
        }

        const title = postTitle.value.trim();
        const content = postContent.value.trim();
        const tags = postTags.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        const image = postImage.value.trim();

        if (!title || !content) {
            alert('Please fill in the title and content');
            return;
        }

        const postData = {
            title,
            content,
            tags,
            image: image || null,
            author: {
                uid: user.uid,
                name: user.displayName,
                photoURL: user.photoURL
            },
            status: 'draft',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            comments: []
        };

        await db.collection('posts').add(postData);
        window.location.href = '/blog.html';
    } catch (error) {
        console.error('Error saving draft:', error);
        alert('Failed to save draft. Please try again.');
    }
}); 