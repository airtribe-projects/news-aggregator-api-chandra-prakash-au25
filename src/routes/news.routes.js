const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const newsController = require('../controller/news.controller');

router.get('/news', auth, newsController.getNews);
router.get('/news/search/:query', auth, newsController.searchNews);
router.post('/news/:id/read', auth, newsController.markRead);
router.post('/news/:id/favorite', auth, newsController.markFavorite);
router.get('/news/read', auth, newsController.getMarkedArticles);
router.get('/news/favorites', auth, newsController.getMarkedArticles);

module.exports = router;
