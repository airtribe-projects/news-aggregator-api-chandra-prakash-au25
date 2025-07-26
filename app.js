const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const authRoutes = require('./src/routes/auth.routes');
const newsRoutes = require('./src/routes/news.routes');

const connectDB = require('./config/database');

const app = express();
const port = process.env.PORT || 3000;

connectDB();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Check for SESSION_SECRET in environment variables
if (!process.env.SESSION_SECRET) {
    console.error('SESSION_SECRET is not defined in environment variables');
    process.exit(1);
}

// Session middleware setup
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));


// Improved error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    // Default to 500 if statusCode is not set
    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
        error: err.message || 'Something went wrong!'
    });
});


app.use('/v1/auth', authRoutes);
app.use('/v1/news', newsRoutes);
app.listen(port, (err) => {
    if (err) {
        console.log('Something bad happened', err);
        process.exit(1);
    }
    console.log(`Server is listening on ${port}`);
});

module.exports = app;
