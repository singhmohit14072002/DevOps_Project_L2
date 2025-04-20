// Store blogs in localStorage
let blogs = JSON.parse(localStorage.getItem('blogs')) || [];

// Function to create a blog post element
function createBlogPost(blog) {
    const blogPost = document.createElement('div');
    blogPost.className = 'blog-post';
    
    const date = new Date(blog.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    blogPost.innerHTML = `
        <div class="blog-post-header">
            <div>
                <h3 class="blog-post-title">${blog.title}</h3>
                <div class="blog-post-meta">
                    <span><i class="fas fa-user"></i> ${blog.author}</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                    <span><i class="fas fa-folder"></i> ${blog.category}</span>
                </div>
            </div>
        </div>
        <div class="blog-post-content">
            ${blog.content}
        </div>
        <div class="blog-post-tags">
            ${blog.tags.map(tag => `<span class="blog-tag">${tag}</span>`).join('')}
        </div>
    `;

    return blogPost;
}

// Function to display all blogs
function displayBlogs() {
    const blogPostsContainer = document.getElementById('blogPosts');
    blogPostsContainer.innerHTML = '';

    if (blogs.length === 0) {
        blogPostsContainer.innerHTML = '<p>No blog posts yet. Be the first to write one!</p>';
        return;
    }

    // Sort blogs by date, newest first
    blogs.sort((a, b) => new Date(b.date) - new Date(a.date));

    blogs.forEach(blog => {
        blogPostsContainer.appendChild(createBlogPost(blog));
    });
}

// Handle form submission
document.getElementById('blogForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const blog = {
        title: document.getElementById('blogTitle').value,
        author: document.getElementById('authorName').value,
        category: document.getElementById('blogCategory').value,
        content: document.getElementById('blogContent').value,
        tags: document.getElementById('blogTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0),
        date: new Date().toISOString()
    };

    // Add new blog to array
    blogs.unshift(blog);

    // Save to localStorage
    localStorage.setItem('blogs', JSON.stringify(blogs));

    // Reset form
    this.reset();

    // Update display
    displayBlogs();

    // Show success message
    alert('Blog post published successfully!');
});

// Initial display of blogs
displayBlogs(); 