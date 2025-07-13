const axios = require('axios');
const NewsAPI = require('newsapi');
const NodeCache = require('node-cache');
const Article = require('../models/article.model');

const newsCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

class NewsController {
  async getNews(req, res) {
    try {
      if (!req.user || !req.user.preferences) {
        return res.status(400).json({
          error: 'Bad request',
          details: 'User preferences are required',
          code: 'NEWS_MISSING_PREFERENCES'
        });
      }
      
      const { preferences } = req.user;
      const cacheKey = `news_${preferences.join('_')}`;
      
      const cachedNews = newsCache.get(cacheKey);
      if (cachedNews) {
        return res.json(cachedNews);
      }

      const apiKey = process.env.NEWS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'Configuration error',
          details: 'News API key not configured',
          code: 'NEWS_API_KEY_MISSING'
        });
      }

      const newsapi = new NewsAPI(apiKey);
      const response = await newsapi.v2.topHeadlines({
        category: preferences.join(','),
        language: 'en',
        country: 'us'
      });

      newsCache.set(cacheKey, response.articles);
      
      res.json(response.articles);
    } catch (error) {
      console.error('News API error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Failed to fetch news',
        details: 'Internal server error',
        code: 'NEWS_FETCH_FAILED'
      });
    }
  }

  async searchNews(req, res) {
    try {
      const { query } = req.params;
      if (!query || query.trim().length < 3) {
        return res.status(400).json({
          error: 'Bad request',
          details: 'Search query must be at least 3 characters',
          code: 'NEWS_INVALID_QUERY'
        });
      }
      
      const apiKey = process.env.NEWS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'Configuration error',
          details: 'News API key not configured',
          code: 'NEWS_API_KEY_MISSING'
        });
      }

      const newsapi = new NewsAPI(apiKey);
      const response = await newsapi.v2.everything({
        q: query,
        language: 'en',
        sortBy: 'relevancy'
      });

      res.json(response.articles);
    } catch (error) {
      console.error('News search error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Failed to search news',
        details: 'Internal server error',
        code: 'NEWS_SEARCH_FAILED'
      });
    }
  }

  async markArticle(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body;
      const userId = req.user.userId;

      if (!['read', 'favorite'].includes(action)) {
        return res.status(400).json({
          error: 'Bad request',
          details: 'Invalid action specified',
          code: 'NEWS_INVALID_ACTION'
        });
      }

      const article = await Article.findOneAndUpdate(
        { articleId: id, userId },
        { [action]: true },
        { upsert: true, new: true }
      );

      res.json({
        message: `Article marked as ${action}`,
        articleId: article.articleId,
        [action]: true
      });
    } catch (error) {
      console.error('Mark article error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Failed to mark article',
        details: 'Internal server error',
        code: 'NEWS_MARK_FAILED'
      });
    }
  }

  async getMarkedArticles(req, res) {
    try {
      const { type } = req.params;
      const userId = req.user.userId;

      if (!['read', 'favorite'].includes(type)) {
        return res.status(400).json({
          error: 'Bad request',
          details: 'Invalid type specified',
          code: 'NEWS_INVALID_TYPE'
        });
      }

      const articles = await Article.find({
        userId,
        [type]: true
      });

      res.json(articles.map(article => ({
        id: article.articleId,
        title: article.title,
        url: article.url,
        [type]: true
      })));
    } catch (error) {
      console.error('Get marked articles error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Failed to get marked articles',
        details: 'Internal server error',
        code: 'NEWS_GET_MARKED_FAILED'
      });
    }
  }
}

module.exports = new NewsController();