const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authController = require('../controller/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/profile', auth, authController.updateProfile);
router.post('/refresh', authController.refreshToken);

module.exports = router;
