const axios = require('axios');
const NewsAPI = require('newsapi');
const NodeCache = require('node-cache');
const Article = require('../models/article.model');

const newsCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

class NewsController {
  async getNews(req, res) {
    try {
      const { preferences } = req.user;
      const cacheKey = `news_${preferences.join('_')}`;
      
      // Check cache first
      const cachedNews = newsCache.get(cacheKey);
      if (cachedNews) {
        return res.json(cachedNews);
      }

      const apiKey = process.env.NEWS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'News API key not configured' });
      }

      const newsapi = new NewsAPI(apiKey);
      const response = await newsapi.v2.topHeadlines({
        category: preferences.join(','),
        language: 'en',
        country: 'us'
      });

      // Cache the response
      newsCache.set(cacheKey, response.articles);
      
      res.json(response.articles);
    } catch (error) {
      console.error('News API error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch news', 
        details: error.message 
      });
    }
  }

  async searchNews(req, res) {
    try {
      const { query } = req.params;
      const apiKey = process.env.NEWS_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: 'News API key not configured' });
      }

      const newsapi = new NewsAPI(apiKey);
      const response = await newsapi.v2.everything({
        q: query,
        language: 'en',
        sortBy: 'relevancy'
      });

      res.json(response.articles);
    } catch (error) {
      console.error('News search error:', error);
      res.status(500).json({ 
        error: 'Failed to search news', 
        details: error.message 
      });
    }
  }

  async markArticle(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body;
      const userId = req.user.userId;

      const article = await Article.findOneAndUpdate(
        { articleId: id, userId },
        { [action]: true },
        { upsert: true, new: true }
      );

      res.json({ message: `Article marked as ${action}`, article });
    } catch (error) {
      console.error('Mark article error:', error);
      res.status(500).json({ 
        error: 'Failed to mark article', 
        details: error.message 
      });
    }
  }

  async getMarkedArticles(req, res) {
    try {
      const { type } = req.params;
      const userId = req.user.userId;

      const articles = await Article.find({ 
        userId, 
        [type]: true 
      });

      res.json(articles);
    } catch (error) {
      console.error('Get marked articles error:', error);
      res.status(500).json({ 
        error: 'Failed to get marked articles', 
        details: error.message 
      });
    }
  }
}

module.exports = new NewsController();