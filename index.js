import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import fs from 'fs';
import multer from 'multer';

const app = express();
const dataFilePath = './data.json';
const port = process.env.PORT || 3000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/'); // Save files in the 'public/uploads/' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Save with unique timestamp and original name
  },
});

const upload = multer({ storage: storage });

app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Utility function to read data from the JSON file
function readData() {
  const data = fs.readFileSync(dataFilePath, 'utf8');
  let articles = JSON.parse(data); // First, parse the JSON string
  articles = articles.sort((a, b) => b.id - a.id); // Then sort the parsed JSON by id in descending order
  return articles; // Return the sorted articles
}

let blog = readData();

// Utility function to write data to the JSON file
function writeData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/', async (req, res) => {
  try {
    const result = await axios.get('http://localhost:3000/api');
    blog.sort((a, b) => b.id - a.id);
    res.render('index.ejs', { content: result });
  } catch (error) {
    res.status(404).send('Post not found');
  }
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/write', (req, res) => {
  res.render('write');
});

// GET (read all users)
app.get('/api', (req, res) => {
  blog = blog.sort((a, b) => b.id - a.id);
  res.json(blog);
});

const recentBlog = blog.slice(0, 4);

app.get('/view/:id', (req, res) => {
  const postId = req.params.id;
  blog = blog.sort((a, b) => a.id - b.id);
  const post = blog[postId];
  if (post) {
    res.render('mainBlog', { content: post, recent: recentBlog });
  } else {
    res.status(404).send({ error: 'Post not found' });
  }
});

app.get('/updateBlog/:id', (req, res) => {
  const blogId = req.params.id;
  const blogUpdate = blog[blogId];
  if (blogUpdate) {
    res.render('updateBlog', { content: blogUpdate });
  } else {
    res.status(404).send({ error: 'Post not found' });
  }
});

// POST (add a new blog)
app.post('/publish', upload.single('file'), (req, res) => {
  let existingData = [];
  try {
    // const fileContent = fs.readFileSync(dataFilePath, 'utf8');
    // existingData = JSON.parse(fileContent);

    // const newPost = {
    //   id: existingData.length,
    //   author: req.body.author,
    //   title: req.body.title,
    //   description: req.body.description,
    //   urlToImage: req.file ? `/uploads/${req.file.filename}` : res.send('Please add an Image!'),
    //   publishedAt: formatDate(new Date()),
    //   content: req.body.content,
    // };

    // existingData.push(newPost);

    // fs.writeFileSync(dataFilePath, JSON.stringify(existingData, null, 2), 'utf8');
    res.render('WorkInProgress');
    res.redirect('/');
  } catch (error) {
    res.status(500).send('Error publishing post');
  }
});

// delete
app.post('/delete-blog/:id', (req, res) => {
  const blogId = req.params.id;
  const updatedBlog = blog.filter((u) => u.id !== parseInt(blogId)); // Filter out the blog to be deleted

  if (blog.length !== updatedBlog.length) {
    blog = updatedBlog; // Update the blog array
    writeData(blog); // Save the updated blog list
    res.redirect('/');
    res.status(204).send(); // Send a 204 No Content response
  } else {
    res.status(404).json({ message: 'Blog not found' });
  }
});

// edit personal blog
app.post('/edit-blog/:id', upload.single('file'), (req, res) => {
  const blogId = parseInt(req.params.id);

  // Find the index of the blog to update
  const blogIndex = blog.findIndex((b) => b.id === blogId);
  if (blogIndex === -1) {
    return res.status(404).send('Blog not found');
  }

  // Prepare the updated blog entry
  const updatedBlog = {
    ...blog[blogIndex], // Spread the existing blog entry
    title: req.body.title,
    author: req.body.author,
    description: req.body.description,
    content: req.body.content,
    urlToImage: req.file ? `/uploads/${req.file.filename}` : blog[blogIndex].urlToImage, // Retain old image if no new one is uploaded
  };

  // Replace the old blog entry with the updated one
  blog[blogIndex] = updatedBlog;

  writeData(blog);

  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

function formatDate(date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthIndex = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();

  return months[monthIndex] + ' ' + day + ', ' + year;
}
