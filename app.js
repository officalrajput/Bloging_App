require('dotenv').config();
const express = require('express')
const app = express();
const path = require('path');
const cookieparser = require('cookie-parser')
const mongoose = require('mongoose')
const userSchema = require('./models/user-model');
const  postSchema = require('./models/post-model');
const mongooseConnection  = require('./config/mongoose')
app.set('view engine', 'ejs');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieparser());
app.use(express.static(path.join(__dirname, 'public')));



const PORT = process.env.PORT || 3000

app.get('/',(req,res) =>{
    res.render('index',{ errorMessage: null });
})

//For Register New Account
app.post('/register', async (req,res)=>{
   let  {username,name,email,password,age} = req.body;

  let user =  await userSchema.findOne({email});
  if(user) return res.status(500).send("Already Exist");

    bcrypt.genSalt(10,(err,salt) => {
        bcrypt.hash(password,salt, async (err,hash) =>{
           const registerUser = await userSchema.create({
                username,
                name,
                email,
                password:hash,
                age,
            })
            let token = jwt.sign({email:email,userid:registerUser._id},"Snehasaduu")
            res.cookie('token',token);
            res.render('login',{ errorMessage: null });
        })
    })
} )

// Render login page without errors (for GET request)
app.get('/login', (req, res) => {
    res.render('login', { errorMessage: null }); 
});

// For Login
app.post('/login', async (req, res) => {
    let { email, password } = req.body;
    let user = await userSchema.findOne({ email });
    if (!user) {
        return res.status(500).render('login', { errorMessage: 'Email does not exist' });
    }
    bcrypt.compare(password, user.password, async (err, result) => {
        if (result) {
            let token = jwt.sign({email:email,userid:user._id},"Snehasaduu",{ expiresIn: '1h' })
            res.cookie('token',token);
            res.redirect('/profile');
        } else {
            return res.status(500).render('login', { errorMessage: 'Incorrect password' });
        }
    });
});

// For Logout
app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

//For Profile Page
app.get('/profile', inLoggedIn, async (req,res)=>{
 let user = await  userSchema.findOne({email:req.user.email}).populate("posts")
    res.render('profile',{user});
})

// For Create Post

app.post('/create-post', inLoggedIn,async (req,res)=>{
    let user = await userSchema.findOne({email:req.user.email});
    let {content} = req.body

    let createPost = await postSchema.create({
        user:user._id,
        content
    })

    //user ko bhi to bata na pade ga ki ham ne post ker di hai
    user.posts.push(createPost._id);
    await user.save();
    res.redirect('/profile');

})

//For Delete Post

app.post('/delete-post', inLoggedIn, async (req, res) => {
    try {
        // Find the user and populate their posts
        let user = await userSchema.findOne({ email: req.user.email }).populate("posts");

        // Extract postId from the form submission
        const postId = req.body.postId;

        // Find the post in user's posts array
        const post = user.posts.find(post => post._id.toString() === postId);

        // If post exists, delete it
        if (post) {
            // Delete the post from the post collection
            await postSchema.findByIdAndDelete(postId);

            // Remove the reference from the user's posts array
            user.posts = user.posts.filter(post => post._id.toString() !== postId);
            await user.save(); // Save the updated user
        }

        // Redirect after deletion (back to profile or posts page)
        res.redirect('/profile'); // or wherever you want to redirect
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

//For Like Post
app.post('/like-post', inLoggedIn, async (req, res) => {
    try {
        // Extract postId from the form submission
        const postId = req.body.postId;

        // Find the post by postId
        const post = await postSchema.findById(postId);

        // Check if post exists
        if (!post) {
            return res.status(404).send('Post not found');
        }

        // Check if user has already liked the post
        const userId = req.user._id;

        if (post.likes.includes(userId)) {
            return res.status(400).send('You have already liked this post');
        }

        // Add user's ID to the likes array
        post.likes.push(userId);

        // Save the updated post
        await post.save();

        // Redirect or send success response
        res.redirect('/profile'); // or send a JSON response like { success: true }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

//For Edit Post --- IMP
app.get('/edit-post/:id', inLoggedIn,async (req,res) =>{
    let post = await postSchema.findOne({_id:req.params.id}).populate('user');
    res.render("edit-post",{post});

})

// For Update- post change
app.post('/update-post/:id', inLoggedIn, async (req, res) => {
    try {
        // Find and update the post
        let post = await postSchema.findOneAndUpdate(
            { _id: req.params.id },
            { content: req.body.content },
            { new: true } // Return the updated document
        );
        // Redirect to the profile page
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).send('Internal Server Error');
    }
});


//For Protected Route Middleware
function inLoggedIn(req, res, next) {
    if (!req.cookies || !req.cookies.token) {  // Handle missing cookies or token
        return res.redirect('/login');
    }
    try {
        const data = jwt.verify(req.cookies.token, 'Snehasaduu');
        req.user = data;
        next();
    } catch (err) {
        return res.redirect('/login'); 
    }
}

app.listen(PORT ,() => console.log(`Server Started at Port ${PORT}`));