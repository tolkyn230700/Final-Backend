require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('./models/User');
const nodemailer = require('nodemailer');
const axios = require('axios');
const Portfolio = require('./models/Portfolio');
const multer = require('multer');
const path = require('path');

const app = express();

app.use(express.static('public'));

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, httpOnly: true },
}));

mongoose.connect(process.env.MONGODB_URL).then(() => console.log('Connected to MongoDB'));

async function seedAdmin() {
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    const adminUser = new User({
      username: 'admin',
      password: hashedPassword,
      firstName: 'Tolkyn',
      lastName: 'Zharkenova',
      age: 18,
      gender: 'female',
      email: 'anatolymarattzr@gmail.com',
      role: 'admin',
      twoFactorSecret: null,
    });
    await adminUser.save();
    console.log('Admin user created.');
  }
}
seedAdmin();

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password, firstName, lastName, age, gender, email } = req.body;

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      let message = '';
      if (existingUser.username === username) message = 'Username is already taken.';
      if (existingUser.email === email) message = 'Email is already registered.';
      if (existingUser.username === username && existingUser.email === email) {
        message = 'Both username and email are already registered.';
      }
      return res.render('register', { message: message || '' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      firstName,
      lastName,
      age,
      gender,
      email,
      role: 'editor',
      twoFactorSecret: null,
    });

    const twoFactorSecret = speakeasy.generateSecret({ name: 'YourAppName' });
    user.twoFactorSecret = twoFactorSecret.base32;
    await user.save();

    const twoFactorQRCode = await qrcode.toDataURL(twoFactorSecret.otpauth_url);

    await sendRegistrationEmail(email, username);

    res.render('2fa-setup', { twoFactorQRCode });
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', { message: 'An error occurred. Please try again.' });
  }
});


app.get('/login', (req, res) => {
  res.render('login', { message: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.render('login', { message: 'User not found.' });

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) return res.render('login', { message: 'Invalid password.' });

    if (!user.twoFactorSecret) {
      const twoFactorSecret = speakeasy.generateSecret({ name: 'YourAppName' });
      const twoFactorQRCode = await qrcode.toDataURL(twoFactorSecret.otpauth_url);

      user.twoFactorSecret = twoFactorSecret.base32;
      await user.save();

      req.session.tempUserId = user._id;

      return res.render('2fa-setup', { twoFactorQRCode });
    }

    req.session.tempUserId = user._id;
    res.redirect('/2fa');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { message: 'An error occurred. Please try again.' });
  }
});


app.get('/2fa', (req, res) => {
  if (!req.session.tempUserId) {
    return res.redirect('/login'); 
  }
  res.render('2fa', { message: null }); 
});

app.post('/2fa', async (req, res) => {
  const { twoFactorCode } = req.body;
  const user = await User.findById(req.session.tempUserId);

  if (!user) return res.redirect('/login');

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: twoFactorCode,
  });

  if (!verified) {
    return res.render('2fa', { message: 'Invalid 2FA code.' });
  }

  req.session.user = { id: user._id, role: user.role };
  delete req.session.tempUserId; 
  res.redirect('/home');
});

app.post('/2fa', async (req, res) => {
  const { twoFactorCode } = req.body;

  const user = await User.findById(req.session.tempUserId);
  if (!user) return res.redirect('/login');

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: twoFactorCode,
  });

  if (!verified) return res.render('2fa', { message: 'Invalid 2FA code.' });

  req.session.user = { id: user._id, role: user.role };
  delete req.session.tempUserId;
  res.redirect('/home');
});


app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Failed to log out');
    }
    res.redirect('/login'); 
  });
});

function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    res.redirect('/login');
  }
}

app.get('/home', ensureAuthenticated, async (req, res) => {
  try {
    const user = req.session.user || null;
    
    const portfolioItems = await Portfolio.find();
    
    res.render('home', { user, portfolioItems });
  } catch (error) {
    console.error('Error fetching portfolio items:', error);
    res.status(500).send('Error loading home page.');
  }
});

app.get('/currency', ensureAuthenticated, (req, res) => {
  const user = req.session.user || null;
  res.render('currency', { user });
});

app.get('/news', ensureAuthenticated, (req, res) => {
  const user = req.session.user || null;
  res.render('news', { user });
});








app.post('/api/news', ensureAuthenticated, async (req, res) => {
  const { category, startDate, endDate } = req.body;

  try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
              q: category,
              from: startDate,
              to: endDate,
              apiKey: process.env.NEWS_API_KEY,
              pageSize: 100,
          }
      });

      const articles = response.data.articles;
      const dateCounts = {};

      articles.forEach(article => {
          const date = new Date(article.publishedAt).toISOString().split('T')[0];
          dateCounts[date] = (dateCounts[date] || 0) + 1;
      });

      const sortedDates = Object.keys(dateCounts).sort();
      const articleCounts = sortedDates.map(date => dateCounts[date]);

      res.json({ dates: sortedDates, articleCounts });
  } catch (error) {
      console.error('Error fetching news data:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to fetch news data.' });
  }
});










app.post('/api/heaviest-cats', ensureAuthenticated, async (req, res) => {
  try {
    const response = await axios.get('https://api.thecatapi.com/v1/breeds', {
      headers: { 'x-api-key': process.env.CAT_API_KEY }
    });

    const breeds = response.data;
    const breedWeights = breeds.map(breed => ({
      name: breed.name,
      weight: breed.weight.metric.split(' - ').map(Number) 
    }));

    breedWeights.sort((a, b) => {
      const avgWeightA = (a.weight[0] + a.weight[1]) / 2;
      const avgWeightB = (b.weight[0] + b.weight[1]) / 2;
      return avgWeightB - avgWeightA; 
    });

    const top10Breeds = breedWeights.slice(0, 10).map(breed => ({
      name: breed.name,
      avgWeight: (breed.weight[0] + breed.weight[1]) / 2
    }));

    res.json(top10Breeds);
  } catch (error) {
    console.error('Error fetching cat breed data:', error);
    res.status(500).json({ error: 'Failed to fetch cat breed data.' });
  }
});








app.get('/api/random-cat', ensureAuthenticated, async (req, res) => {
  try {
    const response = await axios.get('https://api.thecatapi.com/v1/images/search', {
      headers: { 'x-api-key': process.env.CAT_API_KEY }
    });
    const imageUrl = response.data[0]?.url; 
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error fetching random cat image:', error);
    res.status(500).json({ error: 'Failed to fetch random cat image.' });
  }
});



app.get('/api/recent-news', ensureAuthenticated, async (req, res) => {
  const daysBack = 6; 
  const currentDate = new Date();
  const startDate = new Date();
  startDate.setDate(currentDate.getDate() - daysBack);

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: 'latest', 
        from: startDate.toISOString().split('T')[0],
        to: currentDate.toISOString().split('T')[0],
        sortBy: 'publishedAt',
        apiKey: process.env.NEWS_API_KEY,
        pageSize: 10,
      },
    });

    const articles = response.data.articles || [];
    res.json(articles);
  } catch (error) {
    console.error('Error fetching recent news:', error.message);
    res.status(500).json({ error: 'Failed to fetch recent news.' });
  }
});





const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); 
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });



app.get('/portfolio', ensureAuthenticated, async (req, res) => {
  const portfolioItems = await Portfolio.find();
  res.render('portfolio', { user: req.session.user, portfolioItems });
});

app.post('/portfolio', ensureAuthenticated, upload.array('images', 3), async (req, res) => {
  const { title, description } = req.body;
  const images = req.files.map(file => `/uploads/${file.filename}`); 

  try {
    const portfolioItem = new Portfolio({
      title,
      description,
      images,
      createdBy: req.session.user.role, 
    });
    await portfolioItem.save();
    res.redirect('/home');
  } catch (error) {
    console.error('Error creating portfolio item:', error);
    res.status(500).send('Failed to create portfolio item.');
  }
});





app.post('/delete-portfolio/:id', ensureAuthenticated, async (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.status(403).send('Permission denied');
  }

  try {
    const portfolioItem = await Portfolio.findByIdAndDelete(req.params.id);
    if (!portfolioItem) {
      return res.status(404).send('Portfolio item not found');
    }
    res.redirect('/home'); 
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    res.status(500).send('Failed to delete portfolio item');
  }
});






const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendRegistrationEmail(toEmail, username) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Welcome to my platform XD!',
    text: `Dear ${username},\n\nThank you for registering!!!<33`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Registration email sent successfully!');
  } catch (error) {
    console.error('Error sending registration email:', error);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
